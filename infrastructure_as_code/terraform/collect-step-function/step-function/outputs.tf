output "state_machine_arn" {
  description = "The ARN of the Step Function state machine"
  value       = aws_sfn_state_machine.iam_collect_workflow.arn
}

output "state_machine_name" {
  description = "The name of the Step Function state machine"
  value       = aws_sfn_state_machine.iam_collect_workflow.name
}

output "state_machine_definition" {
  description = "The Step Function state machine definition"
  value       = aws_sfn_state_machine.iam_collect_workflow.definition
}

output "execution_role_arn" {
  description = "The ARN of the Step Function execution role"
  value       = var.execution_role_arn != null ? var.execution_role_arn : aws_iam_role.step_function_execution_role[0].arn
}

output "execution_role_name" {
  description = "The name of the Step Function execution role"
  value       = var.execution_role_arn != null ? "external-role" : aws_iam_role.step_function_execution_role[0].name
}

output "log_group_arn" {
  description = "The ARN of the CloudWatch log group for Step Function logging"
  value       = var.enable_logging ? aws_cloudwatch_log_group.step_function_logs[0].arn : null
}

output "log_group_name" {
  description = "The name of the CloudWatch log group for Step Function logging"
  value       = var.enable_logging ? aws_cloudwatch_log_group.step_function_logs[0].name : null
}

output "state_machine_creation_date" {
  description = "The creation date of the Step Function state machine"
  value       = aws_sfn_state_machine.iam_collect_workflow.creation_date
}

output "state_machine_status" {
  description = "The current status of the Step Function state machine"
  value       = aws_sfn_state_machine.iam_collect_workflow.status
}