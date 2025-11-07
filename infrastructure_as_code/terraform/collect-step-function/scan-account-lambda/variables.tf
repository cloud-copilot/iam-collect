variable "function_name" {
  description = "The name of the Lambda function"
  type        = string
  default     = "scan-account-function"
}

variable "storage_bucket_name" {
  description = "The name of the S3 bucket for storage"
  type        = string
}

variable "storage_bucket_region" {
  description = "The AWS region of the S3 bucket used for storage"
  type        = string
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

variable "initial_role_arn" {
  description = "The ARN of the initial IAM role to assume and use to assume the collect role in the target account. If set to an empty string, no initial role will be assumed."
  type        = string
}

variable "collect_role_name" {
  description = "The name of the collect role to assume in each account"
  type        = string
  default     = "iam-collect"
}

variable "collect_role_path" {
  description = "The path of the collect role to assume in each account"
  type        = string
  default     = "/"

  validation {
    condition     = can(regex("^/", var.collect_role_path)) && can(regex("/$", var.collect_role_path))
    error_message = "Collect role path must begin and end with a forward slash (/)."
  }
}

variable "execution_role_arn" {
  description = "The ARN of the IAM role for Lambda execution (if not provided, one will be created)"
  type        = string
  default     = null
}

variable "timeout" {
  description = "The timeout for the Lambda function in seconds"
  type        = number
  default     = 900

  validation {
    condition     = var.timeout >= 1 && var.timeout <= 900
    error_message = "Timeout must be between 1 and 900 seconds."
  }
}

variable "memory_size" {
  description = "The memory size for the Lambda function in MB"
  type        = number
  default     = 512

  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "Memory size must be between 128 and 10240 MB."
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