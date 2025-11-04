variable "function_name" {
  description = "The name of the Lambda function"
  type        = string
  default     = "iam-collect-list-accounts"
}

variable "execution_role_arn" {
  description = "The ARN of the IAM role for Lambda execution (if not provided, one will be created)"
  type        = string
  default     = null
}

variable "timeout" {
  description = "The timeout for the Lambda function in seconds"
  type        = number
  default     = 90

  validation {
    condition     = var.timeout >= 1 && var.timeout <= 900
    error_message = "Timeout must be between 1 and 900 seconds."
  }
}

variable "memory_size" {
  description = "The memory size for the Lambda function in MB"
  type        = number
  default     = 256

  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "Memory size must be between 128 and 10240 MB."
  }
}

variable "list_accounts_role_arns" {
  description = "Array of role ARNs that the Lambda can assume to call ListAccounts, should have one per organization"
  type        = list(string)
  default     = []
}

variable "environment_variables" {
  description = "Additional environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "A map of tags to assign to the Lambda function and related resources"
  type        = map(string)
  default     = {}
}

variable "initial_role_arn" {
  description = "The ARN of the initial role to assume and then use to assume the ListAccounts roles. If set to an empty string, no initial role will be assumed."
  type        = string
}
