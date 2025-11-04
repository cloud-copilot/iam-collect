output "lambda_function_arn" {
  description = "The ARN of the Lambda function"
  value       = aws_lambda_function.date_prefix_function.arn
}

output "lambda_function_name" {
  description = "The name of the Lambda function"
  value       = aws_lambda_function.date_prefix_function.function_name
}

output "lambda_function_invoke_arn" {
  description = "The ARN to be used for invoking Lambda function from API Gateway"
  value       = aws_lambda_function.date_prefix_function.invoke_arn
}

output "lambda_execution_role_arn" {
  description = "The ARN of the Lambda execution role"
  value       = var.execution_role_arn != null ? var.execution_role_arn : aws_iam_role.lambda_execution_role[0].arn
}

output "lambda_execution_role_name" {
  description = "The name of the Lambda execution role"
  value       = var.execution_role_arn != null ? "external-role" : aws_iam_role.lambda_execution_role[0].name
}

output "lambda_function_version" {
  description = "Latest published version of the Lambda function"
  value       = aws_lambda_function.date_prefix_function.version
}

output "lambda_function_last_modified" {
  description = "The date the Lambda function was last modified"
  value       = aws_lambda_function.date_prefix_function.last_modified
}

output "lambda_function_source_code_size" {
  description = "The size in bytes of the function .zip file"
  value       = aws_lambda_function.date_prefix_function.source_code_size
}