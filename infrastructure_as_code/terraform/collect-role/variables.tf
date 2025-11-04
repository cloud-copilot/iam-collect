variable "role_name" {
  description = "The name of the IAM role to create"
  type        = string
  default     = "iam-collect"
}

variable "role_path" {
  description = "The path for the IAM role"
  type        = string
  default     = "/"

  validation {
    condition     = can(regex("^/", var.role_path)) && can(regex("/$", var.role_path))
    error_message = "Role path must begin and end with a forward slash (/)."
  }
}

variable "central_collect_account_id" {
  description = "The AWS account ID for the central collect account"
  type        = string
}

variable "assume_role_policy" {
  description = "The assume role policy document for the IAM role"
  type        = string
  default     = null
}

variable "description" {
  description = "Description of the IAM role"
  type        = string
  default     = null
}

variable "tags" {
  description = "A map of tags to assign to the IAM role"
  type        = map(string)
  default     = {}
}
