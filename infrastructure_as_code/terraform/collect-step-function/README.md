# IAM Collect Step Function Workflow

This module creates an AWS Step Function to collect all IAM data across all your accounts in any number of organizations.

It creates:

1. A lambda to calculate the S3 prefix based on the current date
2. A lambda to list all accounts in the configured organization(s)
3. A lambda to run iam-collect in a given account and write the data to S3
4. A lambda to index the collected data for easy searching
5. A Step Function to orchestrate the workflow
6. An EventBridge rule to trigger the workflow daily

The module requires that:

1. An S3 bucket is created to store the collected data and this module is deployed in the same account as the bucket.
2. For each organization being collected from, there is a role that can list accounts in that organization.
3. IAM collect roles are deployed in each target account to allow iam-collect to run.

## Workflow Overview

The module uses four lambda functions:

1. Date Prefix Lambda - Creates a date prefix for the S3 bucket; defaults to the current date such as `$your_prefix/2024-01-01/`
2. List Accounts Lambda - Lists all accounts in the organization(s) using the provided role(s)
3. Scan Account Lambda - Scans each account for IAM resources and writes the data to the S3 bucket. This is called in a parallel map for each account.
4. Index Data Lambda - After all accounts are scanned, this creates [the indexes](../../docs/Indexing.md) for easy lookup of resources.

![IAM Collect Step Function Graph](./collect-stepfunction.png)

## IAM Role Assumption Flow

Each Lambda function has different authorization requirements depending on the resources it needs to access. Below is a breakdown of how each function assumes roles to perform its operations.

### Authorization Patterns

| Lambda Function          | Purpose                    | Authorization Flow                                                                           |
| ------------------------ | -------------------------- | -------------------------------------------------------------------------------------------- |
| **Date Prefix Lambda**   | Generate S3 prefix         | _(No permissions needed)_                                                                    |
| **List Accounts Lambda** | List organization accounts | Lambda Execution Role → [Intermediate Role]\* → List Accounts Role(s) → Organizations API    |
| **Scan Account Lambda**  | Collect IAM data           | Lambda Execution Role → [Intermediate Role]\* → Account-Specific Collect Role → Service APIs |
| **Scan Account Lambda**  | Write to S3                | Lambda Execution Role → S3 Bucket _(direct access)_                                          |
| **Index Data Lambda**    | Read/write S3 indexes      | Lambda Execution Role → S3 Bucket _(direct access)_                                          |

**\* Intermediate Role is optional** - You can set `scan_initial_role_arn` and `list_accounts_initial_role_arn` to specify an intermediate role to assume before the target roles. By default the collect role is used. Set either to an empty string to skip this step in the respective flow.

### Detailed Flow Diagrams

#### List Accounts Lambda

```
┌─────────────────────┐
│ Lambda Execution    │
│ Role                │
└──────────┬──────────┘
           │
           ▼ (optional)
┌─────────────────────┐
│ Intermediate Role   │  ← Set via INITIAL_ROLE_ARN environment variable
│ (optional)          │  ← Customize with list_accounts_initial_role_arn in main.tf
└──────────┬──────────┘    If set to an empty string, this step is skipped
           │
           ▼ (one or more)
┌─────────────────────┐
│ List Accounts       │  ← One per organization
│ Role(s)             │  ← Has organizations:ListAccounts permission
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ AWS Organizations   │
│ ListAccounts API    │
└─────────────────────┘
```

#### Scan Account Lambda - IAM Collection Path

```
┌─────────────────────┐
│ Lambda Execution    │
│ Role                │
└──────────┬──────────┘
           │
           ▼ (optional)
┌─────────────────────┐
│ Intermediate Role   │  ← Set via INITIAL_COLLECT_ROLE_ARN environment variable
│ (optional)          │  ← Customize with scan_initial_role_arn in main.tf
└──────────┬──────────┘    If set to an empty string, this step is skipped
           │
           ▼ (per account)
┌─────────────────────┐
│ Account-Specific    │  ← Deployed in each target account
│ Collect Role        │  ← Has IAM read permissions
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Service APIs        │
│ (GetUser, GetRole,  │
│  ListPolicies, etc) │
└─────────────────────┘
```

#### Scan Account Lambda - S3 Write Path

```
┌─────────────────────┐
│ Lambda Execution    │
│ Role                │  ← Has direct S3 write permissions
└──────────┬──────────┘
           │
           ▼ (direct access)
┌─────────────────────┐
│ S3 Bucket           │
│ (PutObject)         │
└─────────────────────┘
```

#### Index Data Lambda - S3 Access Path

```
┌─────────────────────┐
│ Lambda Execution    │
│ Role                │  ← Has direct S3 read/write permissions
└──────────┬──────────┘
           │
           ▼ (direct access)
┌─────────────────────┐
│ S3 Bucket           │
│ (GetObject,         │
│  PutObject)         │
└─────────────────────┘
```

## Javascript Functions

All functions are targeted to Node.js 22.x using CommonJS.

The scan account function highly leverages AWS SDK v3 libraries. Even though the lambda runtime has all AWS SDKs by default, I've observed inconsistent delays updating the AWS managed runtime, so all dependencies are bundled with the node_modules folder to ensure the correct versions are consistently available.

## Using SQLite

iam-collect uses [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) to work with sqlite. better-sqlite3 ships with precompiled binaries for various platforms. This is important for the `scan-account-lambda` and `index-data-lambda` functions.

The lambdas as currently configured to run `arm64`. The build scripts currently run `npm ci`, which by default installs the binaries for the platform running the command. So your build environment should match the target architecture to avoid any issues with incompatible binaries.

Alternatively, you can adjust build scripts (in the respective `package.json`) files to use `npm install --platform=linux --arch=arm64` to force installation of the correct binaries regardless of the build environment platform.

## Scan Account Concurrency

In [this article on monitoring IAM at scale](https://aws.amazon.com/blogs/security/how-to-monitor-and-query-iam-resources-at-scale-part-2/), AWS discloses that IAM api rate limits can apply to "The account from which AssumeRole was called prior to the API call for read APIs". This means that even though we assume a separate role in each target account, the rate limits still apply to the account where the Step Function and Lambdas are running. We've found the default of 50 parallel executions to be a good balance of speed and avoiding throttling, but you can adjust this with the `max_parallel_executions` variable.

## Logging

All functions are configured to log JSON to CloudWatch. All log statements are structured for easy parsing and analysis. `iam-collect` logs are all JSON as well, so logs are easily queried.

## Using data collected by the step function.

The scan account lambda writes data to the s3 bucket. This can be used directly by `iam-lens`. Here is an example configuration that can be used assuming your prefix is `iam-data` and your date format is `YYYY-MM-DD`.

```json
{
  "storage": {
    "type": "s3",
    "bucket": "my-iam-collect-bucket",
    "prefix": "iam-data/2025-12-25/",
    "region": "us-west-2"
  }
}
```

## Usage

```hcl
module "iam_collect_workflow" {
  source = "./collect-step-function"

  # Required variables
  storage_bucket_name         = "my-iam-collect-bucket"
  storage_bucket_region       = "us-east-1"
  collect_role_name           = "iam-collect"
  collect_role_path           = "/"
  list_accounts_role_arns     = [
    "arn:aws:iam::111111111111:role/ListAccountsRole",
    "arn:aws:iam::222222222222:role/ListAccountsRole"
  ]

  tags = {
    Environment = "production"
    Purpose     = "iam-data-collection"
    Owner       = "security-team"
  }
}
```

## Inputs

| Name                           | Description                                                                                                                                                                                                                  | Type           | Default                  | Required |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------ | :------: |
| function_name_prefix           | Prefix for all Lambda function names                                                                                                                                                                                         | `string`       | `"iam-collect"`          |    no    |
| state_machine_name             | The name of the Step Function state machine                                                                                                                                                                                  | `string`       | `"iam-collect-workflow"` |    no    |
| storage_bucket_name            | The name of the S3 bucket for storage                                                                                                                                                                                        | `string`       | n/a                      |   yes    |
| storage_bucket_region          | The AWS region of the S3 bucket used for storage                                                                                                                                                                             | `string`       | n/a                      |   yes    |
| collect_role_name              | The name of the collect role to assume in every account                                                                                                                                                                      | `string`       | `"iam-collect"`          |    no    |
| collect_role_path              | The path of the collect role to assume in every account                                                                                                                                                                      | `string`       | `"/"`                    |    no    |
| list_accounts_role_arns        | List of role ARNs that can list accounts in in your organizations. One per organization                                                                                                                                      | `list(string)` | n/a                      |   yes    |
| scan_initial_role_arn          | The ARN of the initial role to assume and use to assume the account specific role for scanning accounts. If null, the collect role in the central account will be used. If an empty string, no initial role will be assumed. | `string`       | `null`                   |    no    |
| list_accounts_initial_role_arn | The ARN of the initial role to assume and then use to assume the ListAccounts roles. If set to an empty string, no initial role will be assumed.                                                                             | `string`       | `null`                   |    no    |
| max_parallel_executions        | Maximum number of parallel account processing executions in Step Function                                                                                                                                                    | `number`       | `50`                     |    no    |
| base_s3_prefix                 | Base prefix for S3 storage (will be combined with date)                                                                                                                                                                      | `string`       | `"iam-data"`             |    no    |
| enable_step_function_logging   | Enable CloudWatch logging for the Step Function                                                                                                                                                                              | `bool`         | `true`                   |    no    |
| log_retention_days             | Number of days to retain CloudWatch logs                                                                                                                                                                                     | `number`       | `14`                     |    no    |
| environment_variables          | Additional environment variables for Lambda functions                                                                                                                                                                        | `map(string)`  | `{}`                     |    no    |
| schedule_expression            | EventBridge schedule expression for automatic execution (e.g., 'rate(1 day)' or 'cron(0 9 \* _ ? _)'). Set to an empty string to disable scheduling.                                                                         | `string`       | `"cron(0 4 * * ? *)"`    |    no    |
| tags                           | A map of tags to assign to all resources                                                                                                                                                                                     | `map(string)`  | `{}`                     |    no    |

## Outputs

### Step Function Outputs

| Name                             | Description                                 |
| -------------------------------- | ------------------------------------------- |
| state_machine_arn                | The ARN of the Step Function state machine  |
| state_machine_name               | The name of the Step Function state machine |
| step_function_execution_role_arn | The ARN of the Step Function execution role |

### Lambda Function Outputs

| Name                      | Description                                   |
| ------------------------- | --------------------------------------------- |
| date_prefix_lambda_arn    | The ARN of the date prefix Lambda function    |
| date_prefix_lambda_name   | The name of the date prefix Lambda function   |
| list_accounts_lambda_arn  | The ARN of the list accounts Lambda function  |
| list_accounts_lambda_name | The name of the list accounts Lambda function |
| scan_account_lambda_arn   | The ARN of the scan account Lambda function   |
| scan_account_lambda_name  | The name of the scan account Lambda function  |
| index_data_lambda_arn     | The ARN of the index data Lambda function     |
| index_data_lambda_name    | The name of the index data Lambda function    |

### Execution Role Outputs

| Name                                    | Description                                        |
| --------------------------------------- | -------------------------------------------------- |
| date_prefix_lambda_execution_role_arn   | The ARN of the date prefix Lambda execution role   |
| list_accounts_lambda_execution_role_arn | The ARN of the list accounts Lambda execution role |
| scan_account_lambda_execution_role_arn  | The ARN of the scan account Lambda execution role  |
| index_data_lambda_execution_role_arn    | The ARN of the index data Lambda execution role    |

### Logging Outputs

| Name                         | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| step_function_log_group_arn  | The ARN of the Step Function CloudWatch log group  |
| step_function_log_group_name | The name of the Step Function CloudWatch log group |

## Module Components

### 1. Date Prefix Lambda (`./storage-prefix-lambda`)

- **Purpose**: Generates consistent date-based S3 prefixes
- **Runtime**: Node.js 22.x CJS
- **Memory**: 128 MB
- **Timeout**: 30 seconds

### 2. List Accounts Lambda (`./list-accounts-function`)

- **Purpose**: Retrieves accounts from organization(s)
- **Runtime**: Node.js 22.x CJS
- **Memory**: 512 MB
- **Timeout**: Configurable (default 300s)

### 3. Scan Account Lambda (`./scan-account-function`)

- **Purpose**: Collects IAM data from individual accounts
- **Runtime**: Node.js 22.x CJS
- **Memory**: Configurable (default 512 MB)
- **Timeout**: Configurable (default 300s)

### 4. Index Data Lambda (`./index-data-function`)

- **Purpose**: Creates indexes of collected data
- **Runtime**: Node.js 22.x CJS
- **Memory**: Configurable (default 1024 MB)
- **Timeout**: Configurable (default 300s)

### 5. Step Function (`./step-function`)

- **Purpose**: Orchestrates the entire workflow
- **Parallel Processing**: Up to 50 accounts simultaneously
- **Error Handling**: Comprehensive retry and fault tolerance
- **Logging**: Complete CloudWatch integration
