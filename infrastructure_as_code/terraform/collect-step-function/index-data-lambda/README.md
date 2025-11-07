# Index Data Function Terraform Module

This module creates a lambda to index the collected iam data from earlier in the workflow. The lambda is Node.js 22.x using CommonJS.

## Permissions

The module assumes that the storage bucket and this function exist in the same account. The lambda execution role will be granted permission to ListObjects, GetObject, DeleteObject, and PutObject on the specified storage bucket.

## SQLite and Ephemeral Storage

If you are using SQLite for indexing, the function has to download every individual sqlite database and merge them into a single database. To do this the lambda uses the ephemeral storage available to it. It will batch the downloads to avoid exceeding the ephemeral storage size.

You can adjust the size of the ephemeral storage with the `ephemeral_storage_size` variable. The default is 512 MB, which should be sufficient for most use cases. If you have a large number of accounts or large datasets, you may need to increase this value.

Increasing ephemeral storage could increase performance by reducing the number of batches needed. In very large environments, the final merged database may not fit in 512 MB, so you might have to increase ephemeral storage to complete indexing.

## Usage

```hcl
module "index_data_lambda" {
  source = "./index-data-lambda"

  function_name         = "${var.function_name_prefix}-index-data"
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
```

## Inputs

| Name                  | Description                                                                         | Type          | Default                 | Required |
| --------------------- | ----------------------------------------------------------------------------------- | ------------- | ----------------------- | :------: |
| function_name         | The name of the Lambda function                                                     | `string`      | `"index-data-function"` |    no    |
| storage_bucket_name   | The name of the S3 bucket for storage                                               | `string`      | n/a                     |   yes    |
| storage_bucket_region | The AWS region of the S3 bucket used for storage                                    | `string`      | n/a                     |   yes    |
| execution_role_arn    | The ARN of the IAM role for Lambda execution (if not provided, one will be created) | `string`      | `null`                  |    no    |
| timeout               | The timeout for the Lambda function in seconds                                      | `number`      | `900`                   |    no    |
| memory_size           | The memory size for the Lambda function in MB                                       | `number`      | `1024`                  |    no    |
| environment_variables | Additional environment variables for the Lambda function                            | `map(string)` | `{}`                    |    no    |
| tags                  | A map of tags to assign to the Lambda function and related resources                | `map(string)` | `{}`                    |    no    |

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
