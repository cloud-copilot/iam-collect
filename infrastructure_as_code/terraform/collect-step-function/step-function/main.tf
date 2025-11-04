# CloudWatch Log Group for Step Function logging
resource "aws_cloudwatch_log_group" "step_function_logs" {
  count             = var.enable_logging ? 1 : 0
  name              = "/aws/stepfunctions/${var.state_machine_name}"
  retention_in_days = var.log_retention_days

  tags = merge(
    {
      Name    = "${var.state_machine_name}-logs"
      Purpose = "step-function-logging"
    },
    var.tags
  )
}

# IAM role for Step Function execution
resource "aws_iam_role" "step_function_execution_role" {
  count = var.execution_role_arn == null ? 1 : 0
  name  = "${var.state_machine_name}-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    {
      Name    = "${var.state_machine_name}-execution-role"
      Purpose = "step-function-execution"
    },
    var.tags
  )
}

# IAM policy for Lambda invocation permissions
resource "aws_iam_role_policy" "lambda_invocation_policy" {
  count = var.execution_role_arn == null ? 1 : 0
  name  = "${var.state_machine_name}-lambda-invocation-policy"
  role  = aws_iam_role.step_function_execution_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          var.date_prefix_lambda_arn,
          var.list_accounts_lambda_arn,
          var.scan_account_lambda_arn,
          var.index_data_lambda_arn
        ]
      }
    ]
  })
}

# IAM policy for CloudWatch logging permissions
resource "aws_iam_role_policy" "cloudwatch_logs_policy" {
  count = var.execution_role_arn == null && var.enable_logging ? 1 : 0
  name  = "${var.state_machine_name}-cloudwatch-logs-policy"
  role  = aws_iam_role.step_function_execution_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      }
    ]
  })
}

# Step Function State Machine
resource "aws_sfn_state_machine" "iam_collect_workflow" {
  name     = var.state_machine_name
  role_arn = var.execution_role_arn != null ? var.execution_role_arn : aws_iam_role.step_function_execution_role[0].arn
  definition = jsonencode({
    Comment = "IAM Data Collection Workflow - Orchestrates account scanning and data indexing"
    StartAt = "GenerateDatePrefix"
    States = {
      GenerateDatePrefix = {
        Type     = "Task"
        Comment  = "Generate date-based S3 prefix for this collection run"
        Resource = "arn:${data.aws_partition.current.partition}:states:::lambda:invoke"
        Parameters = {
          FunctionName = var.date_prefix_lambda_arn
          Payload = {
            basePrefix = var.base_s3_prefix
          }
        }
        ResultPath = "$.datePrefix"
        Next       = "ListAccounts"
        Retry = [
          {
            ErrorEquals     = ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"]
            IntervalSeconds = 2
            MaxAttempts     = 3
            BackoffRate     = 2.0
          }
        ]
        Catch = [
          {
            ErrorEquals = ["States.TaskFailed"]
            Next        = "HandleDatePrefixFailure"
            ResultPath  = "$.error"
          }
        ]
      }

      ListAccounts = {
        Type     = "Task"
        Comment  = "Retrieve list of all accounts to process"
        Resource = "arn:${data.aws_partition.current.partition}:states:::lambda:invoke"
        Parameters = {
          FunctionName = var.list_accounts_lambda_arn
          Payload      = {}
        }
        ResultPath = "$.accountsList"
        Next       = "CheckAccountsRetrieved"
        Retry = [
          {
            ErrorEquals     = ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"]
            IntervalSeconds = 2
            MaxAttempts     = 3
            BackoffRate     = 2.0
          }
        ]
        Catch = [
          {
            ErrorEquals = ["States.TaskFailed"]
            Next        = "HandleListAccountsFailure"
            ResultPath  = "$.error"
          }
        ]
      }

      CheckAccountsRetrieved = {
        Type    = "Choice"
        Comment = "Check if accounts were successfully retrieved"
        Choices = [
          {
            Variable      = "$.accountsList.Payload.statusCode"
            NumericEquals = 200
            Next          = "ProcessAccounts"
          }
        ]
        Default = "HandleListAccountsFailure"
      }

      ProcessAccounts = {
        Type           = "Map"
        Comment        = "Process each account in parallel with controlled concurrency"
        ItemsPath      = "$.accountsList.Payload.accounts"
        MaxConcurrency = var.max_parallel_executions
        ItemSelector = {
          "accountId.$" = "$$.Map.Item.Value"
          "s3Prefix.$"  = "$.datePrefix.Payload.s3Prefix"
        }
        Iterator = {
          StartAt = "ScanAccount"
          States = {
            ScanAccount = {
              Type     = "Task"
              Comment  = "Scan individual account for IAM data"
              Resource = "arn:${data.aws_partition.current.partition}:states:::lambda:invoke"
              Parameters = {
                FunctionName = var.scan_account_lambda_arn
                Payload = {
                  "accountId.$" = "$.accountId"
                  "s3Prefix.$"  = "$.s3Prefix"
                }
              }
              End = true
              Retry = [
                {
                  ErrorEquals     = ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"]
                  IntervalSeconds = 2
                  MaxAttempts     = 2
                  BackoffRate     = 2.0
                }
              ]
              Catch = [
                {
                  ErrorEquals = ["States.TaskFailed"]
                  Next        = "AccountScanFailed"
                  ResultPath  = "$.error"
                }
              ]
            }

            AccountScanFailed = {
              Type    = "Pass"
              Comment = "Handle individual account scan failure"
              Parameters = {
                "accountId.$" = "$.accountId"
                "status"      = "FAILED"
                "error.$"     = "$.error"
                "timestamp.$" = "$$.State.EnteredTime"
              }
              End = true
            }
          }
        }
        ResultPath = "$.scanResults"
        Next       = "IndexData"
        Catch = [
          {
            ErrorEquals = ["States.ExceedToleratedFailureThreshold"]
            Next        = "HandleProcessingFailure"
            ResultPath  = "$.error"
          }
        ]
      }

      IndexData = {
        Type     = "Task"
        Comment  = "Index collected data for searchability and analysis"
        Resource = "arn:${data.aws_partition.current.partition}:states:::lambda:invoke"
        Parameters = {
          FunctionName = var.index_data_lambda_arn
          Payload = {
            "s3Prefix.$" = "$.datePrefix.Payload.s3Prefix"
          }
        }
        ResultPath = "$.indexResult"
        Next       = "WorkflowComplete"
        Retry = [
          {
            ErrorEquals     = ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException"]
            IntervalSeconds = 5
            MaxAttempts     = 3
            BackoffRate     = 2.0
          }
        ]
        Catch = [
          {
            ErrorEquals = ["States.TaskFailed"]
            Next        = "HandleIndexFailure"
            ResultPath  = "$.error"
          }
        ]
      }

      WorkflowComplete = {
        Type    = "Pass"
        Comment = "Workflow completed successfully"
        Parameters = {
          status                = "SUCCESS"
          message               = "IAM data collection workflow completed successfully"
          "s3Prefix.$"          = "$.datePrefix.Payload.s3Prefix"
          "accountsProcessed.$" = "States.ArrayLength($.scanResults)"
          "timestamp.$"         = "$$.State.EnteredTime"
        }
        End = true
      }

      # Error handling states
      HandleDatePrefixFailure = {
        Type    = "Pass"
        Comment = "Handle date prefix generation failure"
        Parameters = {
          status        = "FAILED"
          stage         = "DATE_PREFIX_GENERATION"
          message       = "Failed to generate date prefix"
          "error.$"     = "$.error"
          "timestamp.$" = "$$.State.EnteredTime"
        }
        End = true
      }

      HandleListAccountsFailure = {
        Type    = "Pass"
        Comment = "Handle account listing failure"
        Parameters = {
          status          = "FAILED"
          stage           = "ACCOUNT_LISTING"
          message         = "Failed to retrieve account list"
          "lambdaError.$" = "$.accountsList.Payload.error"
          "catchError.$"  = "$.error"
          "fullState.$"   = "$"
          "timestamp.$"   = "$$.State.EnteredTime"
        }
        End = true
      }

      HandleProcessingFailure = {
        Type    = "Pass"
        Comment = "Handle account processing failure"
        Parameters = {
          status        = "FAILED"
          stage         = "ACCOUNT_PROCESSING"
          message       = "Too many account processing failures exceeded tolerance"
          "error.$"     = "$.error"
          "timestamp.$" = "$$.State.EnteredTime"
        }
        End = true
      }

      HandleIndexFailure = {
        Type    = "Pass"
        Comment = "Handle data indexing failure"
        Parameters = {
          status        = "FAILED"
          stage         = "DATA_INDEXING"
          message       = "Failed to index collected data"
          "error.$"     = "$.error"
          "timestamp.$" = "$$.State.EnteredTime"
        }
        End = true
      }
    }
  })

  dynamic "logging_configuration" {
    for_each = var.enable_logging ? [1] : []
    content {
      log_destination        = "${aws_cloudwatch_log_group.step_function_logs[0].arn}:*"
      include_execution_data = true
      level                  = "ALL"
    }
  }

  tags = merge(
    {
      Name    = var.state_machine_name
      Purpose = "iam-data-collection"
    },
    var.tags
  )

  depends_on = [
    aws_iam_role_policy.lambda_invocation_policy,
    aws_iam_role_policy.cloudwatch_logs_policy
  ]
}