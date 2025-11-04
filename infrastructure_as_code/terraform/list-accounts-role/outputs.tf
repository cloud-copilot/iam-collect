output "role_arn" {
  description = "The ARN of the ListAccounts role"
  value       = aws_iam_role.list_accounts_role.arn
}

output "role_name" {
  description = "The name of the ListAccounts role"
  value       = aws_iam_role.list_accounts_role.name
}

output "role_id" {
  description = "The stable and unique string identifying the role"
  value       = aws_iam_role.list_accounts_role.id
}

output "role_unique_id" {
  description = "The stable and unique string identifying the role"
  value       = aws_iam_role.list_accounts_role.unique_id
}

output "role_path" {
  description = "The path of the ListAccounts role"
  value       = aws_iam_role.list_accounts_role.path
}

output "role_create_date" {
  description = "The creation date of the ListAccounts role"
  value       = aws_iam_role.list_accounts_role.create_date
}

output "assume_role_policy_json" {
  description = "The assume role policy document in JSON format"
  value       = data.aws_iam_policy_document.assume_role_policy.json
}

output "list_accounts_policy_json" {
  description = "The ListAccounts policy document in JSON format"
  value       = data.aws_iam_policy_document.list_accounts_policy.json
}