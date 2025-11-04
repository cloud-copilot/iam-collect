# Local values for build configuration
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

# Install npm dependencies and build the Lambda function
resource "null_resource" "npm_install_and_build" {
  # Triggers rebuild when source files change or the dist file is missing
  triggers = {
    package_json      = filemd5(local.package_json)
    package_lock_json = filemd5(local.package_lock_json)
    index_js_hash     = filemd5(local.index_js)
    dist_hash         = fileexists(local.dist_path) ? filesha256(local.dist_path) : timestamp()
  }

  provisioner "local-exec" {
    command     = "npm run install-and-build"
    working_dir = local.source_dir
  }
}

# Create ZIP archive of the built Lambda function
data "archive_file" "lambda_zip" {
  depends_on = [null_resource.npm_install_and_build]

  type        = "zip"
  source_file = local.dist_path
  output_path = "${path.module}/lambda-deployment.zip"
}

# IAM role for Lambda execution (created only if execution_role_arn is not provided)
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
      Purpose = "storage-prefix-lambda-execution"
    },
    var.tags
  )
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  count      = var.execution_role_arn == null ? 1 : 0
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_execution_role[0].name
}

# Lambda function
resource "aws_lambda_function" "date_prefix_function" {
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
    variables = var.environment_variables
  }

  tags = merge(
    {
      Name    = var.function_name
      Purpose = "date-prefix-generation"
    },
    var.tags
  )

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution
  ]
}