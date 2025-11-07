variable "function_name_prefix" {
  description = "Prefix for all Lambda function names"
  type        = string
  default     = "iam-collect"
}

variable "state_machine_name" {
  description = "The name of the Step Function state machine"
  type        = string
  default     = "iam-collect-workflow"
}

variable "storage_bucket_name" {
  description = "The name of the S3 bucket for storage"
  type        = string
}

variable "storage_bucket_region" {
  description = "The AWS region of the S3 bucket used for storage"
  type        = string
}

variable "collect_role_name" {
  description = "The name of the collect role to assume in every account"
  type        = string
  default     = "iam-collect"
}

variable "collect_role_path" {
  description = "The path of the collect role to assume in every account"
  type        = string
  default     = "/"

  validation {
    condition     = can(regex("^/", var.collect_role_path)) && can(regex("/$", var.collect_role_path))
    error_message = "Collect role path must begin and end with a forward slash (/)."
  }
}

variable "list_accounts_role_arns" {
  description = "List of role ARNs that can list accounts in your organizations. One per organization."
  type        = list(string)
}

variable "scan_initial_role_arn" {
  type        = string
  default     = null
  description = "The ARN of the initial role to assume and use to assume the account specific role for scanning accounts. If null, the collect role in the central account will be used. If an empty string, no initial role will be assumed."
}

variable "list_accounts_initial_role_arn" {
  type        = string
  default     = null
  description = "The ARN of the initial role to assume and then use to assume the ListAccounts roles. If set to an empty string, no initial role will be assumed."
}

variable "max_parallel_executions" {
  description = "Maximum number of parallel account processing executions in Step Function"
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
  default     = "iam-data"
}

variable "storage_type" {
  description = "The type of storage to use ('s3' or 'sqlite')"
  type        = string
  default     = "s3"

  validation {
    condition     = contains(["s3", "sqlite"], var.storage_type)
    error_message = "Storage type must be either 's3' or 'sqlite'."
  }
}

variable "enable_step_function_logging" {
  description = "Enable CloudWatch logging for the Step Function"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 14
}

variable "environment_variables" {
  description = "Additional environment variables for Lambda functions"
  type        = map(string)
  default     = {}
}

/*
cron(0 4 * * ? * ) - Every day at 4 AM UTC
cron(0 2,10,18 ? * ? * ) - Ever day at 2 AM, 10 AM, and 6 PM UTC
cron(0 2 ? * MON-FRI * ) - Every weekday at 2 AM UTC
*/

variable "schedule_expression" {
  description = "EventBridge cron or rate expression to schedule the Step Function execution (if empty, no schedule is created)"
  type        = string
  default     = "cron(0 4 * * ? *)"
}

variable "tags" {
  description = "A map of tags to assign to all resources"
  type        = map(string)
  default     = {}
}