variable "function_name" {
  description = "The name of the Lambda function"
  type        = string
  default     = "storage-prefix-lambda"
}

variable "execution_role_arn" {
  description = "The ARN of the IAM role for Lambda execution (if not provided, one will be created)"
  type        = string
  default     = null
}

variable "timeout" {
  description = "The timeout for the Lambda function in seconds"
  type        = number
  default     = 30

  validation {
    condition     = var.timeout >= 1 && var.timeout <= 900
    error_message = "Timeout must be between 1 and 900 seconds."
  }
}

variable "memory_size" {
  description = "The memory size for the Lambda function in MB"
  type        = number
  default     = 128

  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "Memory size must be between 128 MB and 10,240 MB."
  }
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