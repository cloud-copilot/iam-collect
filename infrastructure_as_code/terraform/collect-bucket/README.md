# S3 Collect Bucket Terraform Module

This Terraform module creates an AWS S3 bucket designed for collecting IAM data. Has sensible defaults for encryption, block public access, and lifecycle management.

## Bucket Configuration
This module will create the bucket with:
- SSE-S3 encryption with an AWS managed key, and a bucket key enabled
- Block Public Access enabled
- A lifecycle policy to delete objects after 30 days

## Usage

```hcl
module "collect_bucket" {
  source = "./tf/s3-bucket/collect-bucket"

  collect_bucket_name        = "my-iam-collect-bucket-unique-name"

  tags = {
    Environment = "production"
    Owner       = "security-team"
    Project     = "iam-audit"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| collect_bucket_name | The name of the S3 bucket to create | `string` | n/a | yes |
| tags | A map of tags to assign to the S3 bucket | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| bucket_name | The name of the S3 bucket |
| bucket_arn | The ARN of the S3 bucket |
| bucket_region | The AWS region where the bucket is located |

