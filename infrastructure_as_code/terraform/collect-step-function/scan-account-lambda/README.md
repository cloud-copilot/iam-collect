# Scan Account Function Terraform Module

This Terraform module creates a Node.js Lambda function that runs iam-collect data gathering in a single account. The function is automatically built using esbuild for optimal performance.

## IAM Permissions

This module will create an execution role with permission to assume roles

- If `initial_role_arn` is provided, the execution role will be granted permission to assume that role
- If `initial_role_arn` is not provided, the execution role will be granted permission to assume the roles that match the `collect_role_path` and `collect_role_name` inputs

The module assumes that the storage bucket and this function exist in the same account. The lambda execution role will be granted permission to ListObjects, GetObject, DeleteObject, and PutObject on the specified storage bucket.

## Code Bundling

iam-collect makes thorough use of the AWS SDK v3 libraries. The lambda runtime has all AWS SDKs by default, but I've observed inconsistent delays updating the AWS managed runtime with the latest versions. So all dependencies are bundled with esbuild to ensure the correct versions are used when the function runs.

## Usage

```hcl
module "scan_account_lambda" {
  source = "./scan-account-lambda"

  function_name         = "${var.function_name_prefix}-scan-account"
  storage_bucket_name   = var.storage_bucket_name
  storage_bucket_region = var.storage_bucket_region
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
```

## Inputs

| Name                  | Description                                                                                                                                                    | Type          | Default                   | Required |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------- | :------: |
| function_name         | The name of the Lambda function                                                                                                                                | `string`      | `"scan-account-function"` |    no    |
| storage_bucket_name   | The name of the S3 bucket for storage                                                                                                                          | `string`      | n/a                       |   yes    |
| storage_bucket_region | The AWS region of the S3 bucket used for storage                                                                                                               | `string`      | n/a                       |   yes    |
| execution_role_arn    | The ARN of the IAM role for Lambda execution (if not provided, one will be created)                                                                            | `string`      | `null`                    |    no    |
| initial_role_arn      | The ARN of the initial IAM role to assume and use to assume the collect role in the target account. If set to an empty string, no initial role will be assumed | `string`      | n/a                       |   yes    |
| collect_role_name     | The name of the collect role in every account                                                                                                                  | `string`      | `"iam-collect"`           |    no    |
| collect_role_path     | The path of the collect role in every account                                                                                                                  | `string`      | `"/"`                     |    no    |
| timeout               | The timeout for the Lambda function in seconds                                                                                                                 | `number`      | `900`                     |    no    |
| memory_size           | The memory size for the Lambda function in MB                                                                                                                  | `number`      | `512`                     |    no    |
| environment_variables | Additional environment variables for the Lambda function                                                                                                       | `map(string)` | `{}`                      |    no    |
| tags                  | A map of tags to assign to the Lambda function and related resources                                                                                           | `map(string)` | `{}`                      |    no    |

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
