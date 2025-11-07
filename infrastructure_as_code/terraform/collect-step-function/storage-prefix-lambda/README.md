# Date Prefix Lambda Terraform Module

This module creates a Node.js Lambda function to generate date-based S3 prefixes for iam-collect runs. The function uses CommonJS.

## Usage

```hcl
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
```

## Inputs

| Name                  | Description                                                                         | Type          | Default                   | Required |
| --------------------- | ----------------------------------------------------------------------------------- | ------------- | ------------------------- | :------: |
| function_name         | The name of the Lambda function                                                     | `string`      | `"storage-prefix-lambda"` |    no    |
| execution_role_arn    | The ARN of the IAM role for Lambda execution (if not provided, one will be created) | `string`      | `null`                    |    no    |
| timeout               | The timeout for the Lambda function in seconds                                      | `number`      | `30`                      |    no    |
| memory_size           | The memory size for the Lambda function in MB                                       | `number`      | `128`                     |    no    |
| environment_variables | Additional environment variables for the Lambda function                            | `map(string)` | `{}`                      |    no    |
| tags                  | A map of tags to assign to the Lambda function and related resources                | `map(string)` | `{}`                      |    no    |

## Outputs

| Name                             | Description                                                      |
| -------------------------------- | ---------------------------------------------------------------- |
| lambda_function_arn              | The ARN of the Lambda function                                   |
| lambda_function_name             | The name of the Lambda function                                  |
| lambda_function_invoke_arn       | The ARN to be used for invoking Lambda function from API Gateway |
| lambda_execution_role_arn        | The ARN of the Lambda execution role                             |
| lambda_execution_role_name       | The name of the Lambda execution role                            |
| lambda_function_version          | Latest published version of the Lambda function                  |
| lambda_function_last_modified    | The date the Lambda function was last modified                   |
| lambda_function_source_code_size | The size in bytes of the function .zip file                      |
