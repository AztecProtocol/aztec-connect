terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    region = "eu-west-2"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "3.74.2"
    }
  }
}

data "terraform_remote_state" "setup_iac" {
  backend = "s3"
  config = {
    bucket = "aztec-terraform"
    key    = "setup/setup-iac"
    region = "eu-west-2"
  }
}

data "terraform_remote_state" "aztec2_iac" {
  backend = "s3"
  config = {
    bucket = "aztec-terraform"
    key    = "aztec2/iac"
    region = "eu-west-2"
  }
}

provider "aws" {
  profile = "default"
  region  = "eu-west-2"
}

# Need a certificate in us-east-1 for use with Cloudfront.
provider "aws" {
  alias  = "acm"
  region = "us-east-1"
}

# Zone for zk.money
data "aws_route53_zone" "zkmoney" {
  name         = "zk.money"
  private_zone = false
}

data "aws_acm_certificate" "zkmoney" {
  provider = aws.acm
  domain   = "zk.money"
}

# AWS S3 bucket for static hosting
resource "aws_s3_bucket" "zkmoney_bucket" {
  bucket = "zk.money-${var.DEPLOY_TAG}"
  acl    = "public-read"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  policy = <<EOF
{
  "Version": "2008-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForGetBucketObjects",
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::zk.money-${var.DEPLOY_TAG}/*"
    }
  ]
}
EOF

  website {
    index_document = "index.html"
    error_document = "index.html"
  }
}

resource "aws_route53_record" "a_record" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = var.DEPLOY_TAG
  type    = "A"
  alias {
    name                   = aws_s3_bucket.zkmoney_bucket.website_endpoint
    zone_id                = aws_s3_bucket.zkmoney_bucket.hosted_zone_id
    evaluate_target_health = false
  }
}

data "aws_iam_policy_document" "lambda" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type = "Service"
      identifiers = [
        "lambda.amazonaws.com",
        "edgelambda.amazonaws.com"
      ]
    }
  }
}

resource "aws_iam_role" "main" {
  name_prefix        = "twitter_lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda.json
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.main.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "twitter_lambda" {
  filename         = "../../dist/twitter_lambda.zip"
  function_name    = "${var.DEPLOY_TAG}-twitter_lambda"
  role             = aws_iam_role.main.arn
  handler          = "index.main"
  provider         = aws.acm
  source_code_hash = fileexists("../../dist/twitter_lambda.zip") ? filebase64sha256("../../dist/twitter_lambda.zip") : ""
  runtime          = "nodejs12.x"
  publish          = true
}
