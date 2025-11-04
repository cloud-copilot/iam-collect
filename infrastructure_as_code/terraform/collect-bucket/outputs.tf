output "bucket_name" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.collect_bucket.id
}

output "bucket_arn" {
  description = "The ARN of the S3 bucket"
  value       = aws_s3_bucket.collect_bucket.arn
}

output "bucket_region" {
  description = "The AWS region where the bucket is located"
  value       = aws_s3_bucket.collect_bucket.region
}