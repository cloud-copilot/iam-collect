# IAM Collect Role Terraform Module

This module is used to create the role that will be assumed to collect IAM data for an account.

This will create the iam-collect role with the necessary permissions.

## Trust Relationship

By default, the role trusts the central collect account to assume it, enabling cross-account IAM data collection.

## Permissions

If the role is being added to the central collect account, it includes policies to assume similar roles in all other accounts.

## Usage

```hcl
module "iam_collect_role" {
  source = "./tf/s3-bucket/collect-role"

  role_name                  = "iam-collect"  # Uses default value
  role_path                  = "/"            # Uses default value
  central_collect_account_id = "123456789012" # Required: Central collect account ID
  description               = "Role for collecting IAM data across accounts"

  # Optional: Custom assume role policy (if not provided, uses default cross-account trust)
  # assume_role_policy = jsonencode({...})

  tags = {
    Environment = "production"
    Purpose     = "iam-collection"
  }
}
```

## Requirements

| Name      | Version |
| --------- | ------- |
| terraform | >= 1.0  |
| aws       | >= 4.0  |

## Providers

| Name | Version |
| ---- | ------- |
| aws  | >= 4.0  |

## Inputs

| Name                       | Description                                        | Type          | Default         | Required |
| -------------------------- | -------------------------------------------------- | ------------- | --------------- | :------: |
| role_name                  | The name of the IAM role to create                 | `string`      | `"iam-collect"` |    no    |
| role_path                  | The path for the IAM role                          | `string`      | `"/"`           |    no    |
| central_collect_account_id | The AWS account ID for the central collect account | `string`      | n/a             |   yes    |
| assume_role_policy         | The assume role policy document for the IAM role   | `string`      | `null`          |    no    |
| description                | Description of the IAM role                        | `string`      | `null`          |    no    |
| tags                       | A map of tags to assign to the IAM role            | `map(string)` | `{}`            |    no    |

## Outputs

| Name      | Description                                       |
| --------- | ------------------------------------------------- |
| role_arn  | The ARN of the role                               |
| role_name | The name of the IAM role                          |
| role_id   | The stable and unique string identifying the role |

## Features

- **Cross-Account Trust Policy**: If no custom `assume_role_policy` is provided, defaults to allowing the central collect account to assume the role
- **Comprehensive Data Collection Policies**: Includes extensive read-only permissions for IAM, S3, KMS, Lambda, and many other AWS services
- **Role Assumption Capabilities**: When deployed in the central collect account, includes policies to assume similar roles in other accounts
- **Conditional Policy Attachment**: The cross-account assumption policy is only attached when deployed in the central collect account

## Notes

- The role path must begin and end with a forward slash (/)
- The module automatically attaches comprehensive data collection policies for IAM analysis
- Cross-account assumption policies are conditionally applied based on the current account ID
- Default role name is "iam-collect" but can be customized
