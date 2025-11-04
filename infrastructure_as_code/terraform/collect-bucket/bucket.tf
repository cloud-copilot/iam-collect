resource "aws_s3_bucket" "collect_bucket" {
  bucket = var.collect_bucket_name

  tags = merge(
    {
      Name    = var.collect_bucket_name
      Purpose = "iam-data-collection"
    },
    var.tags
  )
}

resource "aws_s3_bucket_server_side_encryption_configuration" "collect_bucket_encryption" {
  bucket = aws_s3_bucket.collect_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "collect_bucket_pab" {
  bucket = aws_s3_bucket.collect_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "collect_bucket_lifecycle" {
  bucket = aws_s3_bucket.collect_bucket.id

  rule {
    id     = "delete_old_versions"
    status = "Enabled"

    expiration {
      days = 30
    }

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
