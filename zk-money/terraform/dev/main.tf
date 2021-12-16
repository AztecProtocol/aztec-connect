terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    region = "eu-west-2"
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

# AWS Cloudfront for caching
resource "aws_cloudfront_distribution" "zkmoney_distribution" {
  origin {
    domain_name = aws_s3_bucket.zkmoney_bucket.website_endpoint
    origin_id   = "website"
    custom_origin_config {
      http_port              = "80"
      https_port             = "443"
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1", "TLSv1.1", "TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Managed by Terraform"
  aliases             = ["${var.DEPLOY_TAG}.zk.money"]
  default_root_object = "/"


  default_cache_behavior {
    target_origin_id = "website"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]

    forwarded_values {
      query_string = true

      cookies {
        forward = "none"
      }
    }
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  ordered_cache_behavior {
    path_pattern           = "/"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "website"
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    lambda_function_association {
      event_type = "origin-response"
      lambda_arn = aws_lambda_function.twitter_lambda.qualified_arn
    }

    forwarded_values {
      query_string = true

      cookies {
        forward = "none"
      }
    }
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = data.aws_acm_certificate.zkmoney.arn
    ssl_support_method  = "sni-only"
  }
}

resource "aws_route53_record" "a_record" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = var.DEPLOY_TAG
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.zkmoney_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.zkmoney_distribution.hosted_zone_id
    evaluate_target_health = true
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

resource "aws_lambda_permission" "allow_cloudfront_invocation" {
  statement_id  = "AllowExecutionFromCloudFront"
  action        = "lambda:InvokeFunction"
  function_name = "${var.DEPLOY_TAG}-twitter_lambda"
  principal     = "edgelambda.amazonaws.com"
  source_arn    = aws_cloudfront_distribution.zkmoney_distribution.arn
  provider      = aws.acm

}

resource "aws_lambda_permission" "allow_cloudfront" {
  provider      = aws.acm
  statement_id  = "AllowGetFromCloudFront"
  action        = "lambda:GetFunction"
  function_name = "${var.DEPLOY_TAG}-twitter_lambda"
  principal     = "edgelambda.amazonaws.com"
  source_arn    = aws_cloudfront_distribution.zkmoney_distribution.arn
}
