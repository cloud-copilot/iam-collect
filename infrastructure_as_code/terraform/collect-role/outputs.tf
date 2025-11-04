output "role_arn" {
  description = "The ARN of the role"
  value       = aws_iam_role.collect_role.arn
}

output "role_name" {
  description = "The name of the IAM role"
  value       = aws_iam_role.collect_role.name
}

output "role_id" {
  description = "The stable and unique string identifying the role"
  value       = aws_iam_role.collect_role.id
}
