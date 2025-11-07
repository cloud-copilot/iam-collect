locals {
  scan_initial_role_arn          = var.scan_initial_role_arn == null ? "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role${var.collect_role_path}${var.collect_role_name}" : var.scan_initial_role_arn
  list_accounts_initial_role_arn = var.list_accounts_initial_role_arn == null ? "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role${var.collect_role_path}${var.collect_role_name}" : var.list_accounts_initial_role_arn
}

# Date Prefix Lambda Module
module "date_prefix_lambda" {
  source = "./storage-prefix-lambda"

  function_name         = "${var.function_name_prefix}-date-prefix"
  environment_variables = var.environment_variables

  tags = merge(
    {
      Component = "storage-prefix-lambda"
      Workflow  = "iam-collect"
    },
    var.tags
  )
}

# List Accounts Lambda Module
module "list_accounts_lambda" {
  source = "./list-accounts-lambda"

  function_name           = "${var.function_name_prefix}-list-accounts"
  initial_role_arn        = local.list_accounts_initial_role_arn
  list_accounts_role_arns = var.list_accounts_role_arns
  environment_variables   = var.environment_variables

  tags = merge(
    {
      Component = "list-accounts-lambda"
      Workflow  = "iam-collect"
    },
    var.tags
  )
}

# Scan Account Lambda Module
module "scan_account_lambda" {
  source = "./scan-account-lambda"

  function_name         = "${var.function_name_prefix}-scan-account"
  storage_bucket_name   = var.storage_bucket_name
  storage_bucket_region = var.storage_bucket_region
  storage_type          = var.storage_type
  initial_role_arn      = local.scan_initial_role_arn
  collect_role_name     = var.collect_role_name
  collect_role_path     = var.collect_role_path
  environment_variables = var.environment_variables

  tags = merge(
    {
      Component = "scan-account-lambda"
      Workflow  = "iam-collect"
    },
    var.tags
  )
}

# Index Data Lambda Module
module "index_data_lambda" {
  source = "./index-data-lambda"

  function_name         = "${var.function_name_prefix}-index-data"
  storage_type          = var.storage_type
  storage_bucket_name   = var.storage_bucket_name
  storage_bucket_region = var.storage_bucket_region
  environment_variables = var.environment_variables

  tags = merge(
    {
      Component = "index-data-lambda"
      Workflow  = "iam-collect"
    },
    var.tags
  )
}

# Step Function Module
module "step_function" {
  source = "./step-function"

  state_machine_name = var.state_machine_name

  # Lambda function ARNs from the modules above
  date_prefix_lambda_arn   = module.date_prefix_lambda.lambda_function_arn
  list_accounts_lambda_arn = module.list_accounts_lambda.lambda_function_arn
  scan_account_lambda_arn  = module.scan_account_lambda.lambda_function_arn
  index_data_lambda_arn    = module.index_data_lambda.lambda_function_arn

  # Step Function configuration
  max_parallel_executions = var.max_parallel_executions
  base_s3_prefix          = var.base_s3_prefix
  enable_logging          = var.enable_step_function_logging
  log_retention_days      = var.log_retention_days

  tags = merge(
    {
      Component = "step-function"
      Workflow  = "iam-collect"
    },
    var.tags
  )

  depends_on = [
    module.date_prefix_lambda,
    module.list_accounts_lambda,
    module.scan_account_lambda,
    module.index_data_lambda
  ]
}

# EventBridge Rule for Step Function Scheduling (optional)
resource "aws_cloudwatch_event_rule" "step_function_schedule" {
  count = var.schedule_expression != "" ? 1 : 0

  name                = "${var.function_name_prefix}-schedule"
  description         = "Trigger IAM collect Step Function on schedule"
  schedule_expression = var.schedule_expression
  state               = "ENABLED"

  tags = merge(
    {
      Component = "step-function-scheduler"
      Workflow  = "iam-collect"
    },
    var.tags
  )
}

# EventBridge Target for Step Function
resource "aws_cloudwatch_event_target" "step_function_target" {
  count = var.schedule_expression != "" ? 1 : 0

  rule      = aws_cloudwatch_event_rule.step_function_schedule[0].name
  target_id = "StepFunctionTarget"
  arn       = module.step_function.state_machine_arn
  role_arn  = aws_iam_role.eventbridge_step_function_role[0].arn

  # Input to pass to the Step Function
  input = jsonencode({
    source = "scheduled"
  })
}

# IAM Role for EventBridge to invoke Step Function
resource "aws_iam_role" "eventbridge_step_function_role" {
  count = var.schedule_expression != "" ? 1 : 0

  name = "${var.function_name_prefix}-eventbridge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    {
      Component = "step-function-scheduler"
      Workflow  = "iam-collect"
    },
    var.tags
  )
}

# IAM Policy for EventBridge to invoke Step Function
resource "aws_iam_role_policy" "eventbridge_step_function_policy" {
  count = var.schedule_expression != "" ? 1 : 0

  name = "${var.function_name_prefix}-eventbridge-policy"
  role = aws_iam_role.eventbridge_step_function_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "states:StartExecution"
        ]
        Resource = module.step_function.state_machine_arn
      }
    ]
  })
}