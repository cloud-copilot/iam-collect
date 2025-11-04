

/*
Trust policy allowing the central collect role to assume this role
This uses a wildcard principal with a condition to limit to a specific role ARN
so that you can create the roles in any order.
*/
data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole"
    ]
    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:PrincipalArn"
      values = [
        "arn:${data.aws_partition.current.partition}:iam::${var.central_collect_account_id}:role${var.trusted_role_path}${var.trusted_role_name}"
      ]
    }
  }
}

/*
Policy document for ListAccounts permission.
Because ListAccounts is an AWS Organizations action, the role must be created in the
management account or in a delegated administrator account.
*/
data "aws_iam_policy_document" "list_accounts_policy" {
  statement {
    effect = "Allow"
    sid    = "ListOrganizationAccounts"
    actions = [
      "organizations:ListAccounts"
    ]
    resources = [
      "*"
    ]
  }
}

# IAM role that can be assumed by the trusted role in the central collect account
resource "aws_iam_role" "list_accounts_role" {
  name               = var.role_name
  path               = var.role_path
  description        = var.description
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json

  tags = merge(
    {
      Name    = var.role_name
      Purpose = "organizations-list-accounts"
    },
    var.tags
  )
}

# Attach the ListAccounts policy to the role
resource "aws_iam_role_policy" "list_accounts_policy" {
  name   = "ListAccountsPolicy"
  role   = aws_iam_role.list_accounts_role.id
  policy = data.aws_iam_policy_document.list_accounts_policy.json
}