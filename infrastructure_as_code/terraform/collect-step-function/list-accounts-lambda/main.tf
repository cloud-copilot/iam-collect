
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
    package_lock_json = filemd5(local.package_lock_json)
    package_json_hash = filemd5(local.package_json)
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

data "aws_iam_policy_document" "assume_intermediate_roles" {
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole"
    ]
    resources = [var.initial_role_arn]
  }
}

data "aws_iam_policy_document" "assume_list_account_roles" {
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole"
    ]
    resources = var.list_accounts_role_arns
  }
}

# Allow assuming the collect role
resource "aws_iam_role_policy" "assume_list_accounts_roles_policy" {
  count = var.execution_role_arn == null && length(var.list_accounts_role_arns) > 0 ? 1 : 0
  name  = "${var.function_name}-assume-roles-policy"
  role  = aws_iam_role.lambda_execution_role[0].id

  policy = var.initial_role_arn == "" ? data.aws_iam_policy_document.assume_list_account_roles.json : data.aws_iam_policy_document.assume_intermediate_roles.json
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  count      = var.execution_role_arn == null ? 1 : 0
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_execution_role[0].name
}

# Lambda function
resource "aws_lambda_function" "list_accounts_function" {
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
        LIST_ACCOUNTS_ROLE_ARNS = join(",", var.list_accounts_role_arns)
        INITIAL_ROLE_ARN        = var.initial_role_arn
      },
      var.environment_variables
    )
  }

  tags = merge(
    {
      Name    = var.function_name
      Purpose = "organizations-list-accounts"
    },
    var.tags
  )

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy.assume_list_accounts_roles_policy
  ]
}