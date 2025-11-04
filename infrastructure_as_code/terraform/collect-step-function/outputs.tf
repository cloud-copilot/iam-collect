# Step Function Outputs
output "state_machine_arn" {
  description = "The ARN of the Step Function state machine"
  value       = module.step_function.state_machine_arn
}

output "state_machine_name" {
  description = "The name of the Step Function state machine"
  value       = module.step_function.state_machine_name
}

output "step_function_execution_role_arn" {
  description = "The ARN of the Step Function execution role"
  value       = module.step_function.execution_role_arn
}

# Lambda Function Outputs
output "date_prefix_lambda_arn" {
  description = "The ARN of the date prefix Lambda function"
  value       = module.date_prefix_lambda.lambda_function_arn
}

output "date_prefix_lambda_name" {
  description = "The name of the date prefix Lambda function"
  value       = module.date_prefix_lambda.lambda_function_name
}

output "list_accounts_lambda_arn" {
  description = "The ARN of the list accounts Lambda function"
  value       = module.list_accounts_lambda.lambda_function_arn
}

output "list_accounts_lambda_name" {
  description = "The name of the list accounts Lambda function"
  value       = module.list_accounts_lambda.lambda_function_name
}

output "scan_account_lambda_arn" {
  description = "The ARN of the scan account Lambda function"
  value       = module.scan_account_lambda.lambda_function_arn
}

output "scan_account_lambda_name" {
  description = "The name of the scan account Lambda function"
  value       = module.scan_account_lambda.lambda_function_name
}

output "index_data_lambda_arn" {
  description = "The ARN of the index data Lambda function"
  value       = module.index_data_lambda.lambda_function_arn
}

output "index_data_lambda_name" {
  description = "The name of the index data Lambda function"
  value       = module.index_data_lambda.lambda_function_name
}

# Lambda Execution Role Outputs
output "date_prefix_lambda_execution_role_arn" {
  description = "The ARN of the date prefix Lambda execution role"
  value       = module.date_prefix_lambda.lambda_execution_role_arn
}

output "list_accounts_lambda_execution_role_arn" {
  description = "The ARN of the list accounts Lambda execution role"
  value       = module.list_accounts_lambda.lambda_execution_role_arn
}

output "scan_account_lambda_execution_role_arn" {
  description = "The ARN of the scan account Lambda execution role"
  value       = module.scan_account_lambda.lambda_execution_role_arn
}

output "index_data_lambda_execution_role_arn" {
  description = "The ARN of the index data Lambda execution role"
  value       = module.index_data_lambda.lambda_execution_role_arn
}

# CloudWatch Log Group Outputs
output "step_function_log_group_arn" {
  description = "The ARN of the Step Function CloudWatch log group"
  value       = module.step_function.log_group_arn
}

output "step_function_log_group_name" {
  description = "The name of the Step Function CloudWatch log group"
  value       = module.step_function.log_group_name
}

# Scheduler Outputs (conditional)
output "schedule_rule_name" {
  description = "The name of the EventBridge rule for scheduling (null if scheduling is disabled)"
  value       = var.schedule_expression != "" ? aws_cloudwatch_event_rule.step_function_schedule[0].name : null
}

output "schedule_rule_arn" {
  description = "The ARN of the EventBridge rule for scheduling (null if scheduling is disabled)"
  value       = var.schedule_expression != "" ? aws_cloudwatch_event_rule.step_function_schedule[0].arn : null
}

output "eventbridge_role_arn" {
  description = "The ARN of the EventBridge IAM role (null if scheduling is disabled)"
  value       = var.schedule_expression != "" ? aws_iam_role.eventbridge_step_function_role[0].arn : null
}

output "is_scheduled" {
  description = "Whether the Step Function is configured for scheduled execution"
  value       = var.schedule_expression != ""
}