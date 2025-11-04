locals {
  source_dir        = "${path.module}/src"
  package_json      = "${local.source_dir}/package.json"
  package_lock_json = "${local.source_dir}/package-lock.json"
  index_js          = "${local.source_dir}/index.js"
  dist_path         = "${path.module}/dist/index.js"
  combined_source_hash = sha256(join("", [
    filemd5(local.package_json),
    filemd5(local.package_lock_json),
    filemd5(local.index_js),
  ]))
}

# Null resource to run npm install and build
resource "null_resource" "lambda_build" {
  # Triggers rebuild when source files change or the dist file is missing
  triggers = {
    index_js_hash     = filemd5(local.index_js)
    package_json_hash = filemd5(local.package_json)
    package_lock_json = filemd5(local.package_lock_json)
    dist_hash         = fileexists(local.dist_path) ? filesha256(local.dist_path) : timestamp()
  }

  provisioner "local-exec" {
    command = "cd ${path.module}/src && npm run install-and-build"
  }
}

# Create ZIP archive of the built Lambda function
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/dist/index.js"
  output_path = "${path.module}/lambda_function.zip"

  depends_on = [null_resource.lambda_build]
}

# IAM role for Lambda execution (created if not provided)
resource "aws_iam_role" "lambda_execution_role" {
  count = var.execution_role_arn == null ? 1 : 0
  name  = "${var.function_name}-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    {
      Name    = "${var.function_name}-execution-role"
      Purpose = "lambda-execution"
    },
    var.tags
  )
}

# IAM policy for S3 bucket access
resource "aws_iam_role_policy" "s3_bucket_policy" {
  count = var.execution_role_arn == null ? 1 : 0
  name  = "${var.function_name}-s3-policy"
  role  = aws_iam_role.lambda_execution_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:s3:::${var.storage_bucket_name}"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:PutObject"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:s3:::${var.storage_bucket_name}/*"
      }
    ]
  })
}

# IAM policy for assuming the initial role, created only if initial_role_arn is provided
resource "aws_iam_role_policy" "assume_initial_role_policy" {
  count = var.execution_role_arn == null && var.initial_role_arn != "" ? 1 : 0
  name  = "${var.function_name}-assume-initial-role-policy"
  role  = aws_iam_role.lambda_execution_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sts:AssumeRole"
        ]
        Resource = var.initial_role_arn
      }
    ]
  })
}

# IAM policy for assuming the iam-collect roles, created only if initial_role_arn is not provided
resource "aws_iam_role_policy" "assume_collect_roles_policy" {
  count = var.execution_role_arn == null && var.initial_role_arn == "" ? 1 : 0
  name  = "${var.function_name}-assume-collect-roles-policy"
  role  = aws_iam_role.lambda_execution_role[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sts:AssumeRole"
        ]
        Resource = ["arn:${data.aws_partition.current.partition}:iam::*:role${var.collect_role_path}${var.collect_role_name}"]
      }
    ]
  })
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  count      = var.execution_role_arn == null ? 1 : 0
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_execution_role[0].name
}

# Lambda function
resource "aws_lambda_function" "scan_account_function" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = var.function_name
  role             = var.execution_role_arn != null ? var.execution_role_arn : aws_iam_role.lambda_execution_role[0].arn
  handler          = "index.handler"
  source_code_hash = local.combined_source_hash
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  timeout          = var.timeout
  memory_size      = var.memory_size

  logging_config {
    log_format = "JSON"
  }

  environment {
    variables = merge(
      {
        STORAGE_BUCKET_NAME        = var.storage_bucket_name
        STORAGE_BUCKET_REGION      = var.storage_bucket_region
        INITIAL_COLLECT_ROLE_ARN   = var.initial_role_arn
        COLLECT_ROLE_PATH_AND_NAME = "${var.collect_role_path}${var.collect_role_name}"
        IAM_COLLECT_RAW_JSON_LOGS  = "true"
      },
      var.environment_variables
    )
  }

  tags = merge(
    {
      Name    = var.function_name
      Purpose = "account-scanning"
    },
    var.tags
  )

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy.s3_bucket_policy,
    aws_iam_role_policy.assume_initial_role_policy,
    aws_iam_role_policy.assume_collect_roles_policy
  ]
}