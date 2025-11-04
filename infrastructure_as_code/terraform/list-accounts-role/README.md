# List Accounts Role Terraform Module

This Terraform module creates an AWS IAM role that can be assumed by a central collect role to list accounts in an AWS Organization. The role is designed for cross-account access to the Organizations ListAccounts API.

## Important Note!
[ListAccounts](https://docs.aws.amazon.com/organizations/latest/APIReference/API_ListAccounts.html) is part of the AWS Organizations service, which requires that the role be created
in the management account or in a delegated administrator account.

Documentation References:
* [Create an AWS Organizations Resources Based Delegation Policy](https://docs.aws.amazon.com/organizations/latest/userguide/orgs-policy-delegate.html)
* [AWS Organizations Policy Examples](https://docs.aws.amazon.com/organizations/latest/userguide/security_iam_resource-based-policy-examples.html)

Here is an example organizations resource policy that delegates organizations:ListAccounts permission to a specific account in your organization:

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "CollectListAccounts",
			"Effect": "Allow",
			"Principal": {
				"AWS": "arn:aws:iam::111222333444:root"
			},
			"Action": "organizations:ListAccounts",
			"Resource": "*"
		}
	]
}
```

## Usage

```hcl
module "list_accounts_role" {
  source = "./tf/s3-bucket/list-accounts-role"

  central_collect_account_id = "123456789012"
  description               = "Role for listing organization accounts"
  trusted_role_name         = "iam-collect"
  trusted_role_path         = "/"

  tags = {
    Environment = "production"
    Purpose     = "account-discovery"
    Owner       = "security-team"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| role_name | The name of the ListAccounts IAM role to create | `string` | `"ListAccountsRole"` | no |
| role_path | The path for the IAM role | `string` | `"/"` | no |
| central_collect_account_id | The AWS account ID for the central collect account | `string` | n/a | yes |
| trusted_role_name | The name of the collect role in the central account that can assume the ListAccounts role | `string` | `"iam-collect"` | no |
| trusted_role_path | The path of the collect role in the central account that can assume the ListAccounts role | `string` | `"/"` | no |
| description | Description of the IAM role | `string` | `"Role for listing AWS Organization accounts"` | no |
| tags | A map of tags to assign to the IAM role | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| role_arn | The ARN of the ListAccounts role |
| role_name | The name of the ListAccounts role |
| role_id | The stable and unique string identifying the role |
| role_unique_id | The stable and unique string identifying the role |
| role_path | The path of the ListAccounts role |
| role_create_date | The creation date of the ListAccounts role |
| assume_role_policy_json | The assume role policy document in JSON format |
| list_accounts_policy_json | The ListAccounts policy document in JSON format |
