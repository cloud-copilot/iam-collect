variable "role_name" {
  description = "The name of the ListAccounts IAM role to create"
  type        = string
  default     = "ListAccountsRole"
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

variable "trusted_role_name" {
  description = "The name of the collect role in the central account, that can assume the ListAccounts role"
  type        = string
  default     = "iam-collect"
}

variable "trusted_role_path" {
  description = "The path of the collect role in the central account that can assume the ListAccounts role"
  type        = string
  default     = "/"

  validation {
    condition     = can(regex("^/", var.trusted_role_path)) && can(regex("/$", var.trusted_role_path))
    error_message = "Trusted role path must begin and end with a forward slash (/)."
  }
}

variable "description" {
  description = "Description of the IAM role"
  type        = string
  default     = "Role for listing AWS Organization accounts"
}

variable "tags" {
  description = "A map of tags to assign to the IAM role"
  type        = map(string)
  default     = {}
}