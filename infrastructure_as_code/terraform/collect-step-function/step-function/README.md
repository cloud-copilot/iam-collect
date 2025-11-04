# IAM Collect Step Function Terraform Module

This Terraform module creates an AWS Step Function that orchestrates the complete IAM data collection workflow. The Step Function coordinates multiple Lambda functions to collect, process, and index IAM data from AWS accounts in a controlled and scalable manner.

## Workflow Overview

The Step Function implements the following workflow:

```
1. GenerateDatePrefix    → Generate date-based S3 prefix
2. ListAccounts          → Retrieve all AWS accounts to process
3. ProcessAccounts       → Scan each account in parallel (max 50 concurrent)
4. IndexData             → Index collected data for analysis
5. WorkflowComplete      → Mark workflow as successfully completed
```

## Usage

```hcl
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
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| state_machine_name | The name of the Step Function state machine | `string` | `"iam-collect-workflow"` | no |
| date_prefix_lambda_arn | The ARN of the date prefix Lambda function | `string` | n/a | yes |
| list_accounts_lambda_arn | The ARN of the list accounts Lambda function | `string` | n/a | yes |
| scan_account_lambda_arn | The ARN of the scan account Lambda function | `string` | n/a | yes |
| index_data_lambda_arn | The ARN of the index data Lambda function | `string` | n/a | yes |
| execution_role_arn | The ARN of the IAM role for Step Function execution (if not provided, one will be created) | `string` | `null` | no |
| max_parallel_executions | Maximum number of parallel account processing executions | `number` | `50` | no |
| base_s3_prefix | Base prefix for S3 storage (will be combined with date) | `string` | `"iam-collect"` | no |
| enable_logging | Enable CloudWatch logging for the Step Function | `bool` | `true` | no |
| log_retention_days | Number of days to retain CloudWatch logs | `number` | `14` | no |
| tags | A map of tags to assign to the Step Function and related resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| state_machine_arn | The ARN of the Step Function state machine |
| state_machine_name | The name of the Step Function state machine |
| state_machine_definition | The Step Function state machine definition |
| execution_role_arn | The ARN of the Step Function execution role |
| execution_role_name | The name of the Step Function execution role |
| log_group_arn | The ARN of the CloudWatch log group for Step Function logging |
| log_group_name | The name of the CloudWatch log group for Step Function logging |
| state_machine_creation_date | The creation date of the Step Function state machine |
| state_machine_status | The current status of the Step Function state machine |

The workflow doesn't require input parameters as all configuration is handled through Lambda environment variables and Step Function parameters.

