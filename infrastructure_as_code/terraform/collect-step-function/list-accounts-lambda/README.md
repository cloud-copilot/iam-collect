# List Accounts Function Terraform Module

This Terraform module creates a Node.js Lambda function that lists all AWS accounts in an organization using the AWS Organizations `ListAccountsCommand` API. The function is automatically built using esbuild for optimal performance.

This module creates a lambda to list all the accounts in your organization(s) using the roles provided. The lambda is Node.js 22.x uses CommonJS and is bundled with esbuild.

## IAM Permissions

This module will create an execution role with permission to assume roles

- If `initial_role_arn` is provided, the execution role will be granted permission to assume that role
- If `initial_role_arn` is not provided, the execution role will be granted permission to assume the roles in `list_accounts_role_arns`

## Usage

```hcl
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
```

## Inputs

| Name                    | Description                                                                                                                                     | Type           | Default                       | Required |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------- | :------: |
| function_name           | The name of the Lambda function                                                                                                                 | `string`       | `"iam-collect-list-accounts"` |    no    |
| execution_role_arn      | The ARN of the IAM role for Lambda execution (if not provided, one will be created)                                                             | `string`       | `null`                        |    no    |
| timeout                 | The timeout for the Lambda function in seconds                                                                                                  | `number`       | `90`                          |    no    |
| memory_size             | The memory size for the Lambda function in MB                                                                                                   | `number`       | `256`                         |    no    |
| initial_role_arn        | The ARN of the initial role to assume and then use to assume the ListAccounts roles. If set to an empty string, no initial role will be assumed | `string`       | n/a                           |   yes    |
| list_accounts_role_arns | Array of role ARNs that the Lambda can assume to call ListAccounts, should have one per organization                                            | `list(string)` | `[]`                          |    no    |
| environment_variables   | Additional environment variables for the Lambda function                                                                                        | `map(string)`  | `{}`                          |    no    |
| tags                    | A map of tags to assign to the Lambda function and related resources                                                                            | `map(string)`  | `{}`                          |    no    |

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
