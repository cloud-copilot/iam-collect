variable "state_machine_name" {
  description = "The name of the Step Function state machine"
  type        = string
  default     = "iam-collect-workflow"
}

variable "date_prefix_lambda_arn" {
  description = "The ARN of the date prefix Lambda function"
  type        = string
}

variable "list_accounts_lambda_arn" {
  description = "The ARN of the list accounts Lambda function"
  type        = string
}

variable "scan_account_lambda_arn" {
  description = "The ARN of the scan account Lambda function"
  type        = string
}

variable "index_data_lambda_arn" {
  description = "The ARN of the index data Lambda function"
  type        = string
}

variable "execution_role_arn" {
  description = "The ARN of the IAM role for Step Function execution (if not provided, one will be created)"
  type        = string
  default     = null
}

variable "max_parallel_executions" {
  description = "Maximum number of parallel account processing executions"
  type        = number
  default     = 50

  validation {
    condition     = var.max_parallel_executions >= 1 && var.max_parallel_executions <= 1000
    error_message = "Max parallel executions must be between 1 and 1000."
  }
}

variable "base_s3_prefix" {
  description = "Base prefix for S3 storage (will be combined with date)"
  type        = string
  default     = "iam-collect"
}

variable "enable_logging" {
  description = "Enable CloudWatch logging for the Step Function"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 14
}

variable "tags" {
  description = "A map of tags to assign to the Step Function and related resources"
  type        = map(string)
  default     = {}
}