# Data source for current AWS partition
data "aws_partition" "current" {}

# Data source for current AWS region
data "aws_region" "current" {}

# Data source for current AWS account
data "aws_caller_identity" "current" {}