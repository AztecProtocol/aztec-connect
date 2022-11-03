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

# AWS S3 bucket for static hosting.
resource "aws_s3_bucket" "hummus" {
  bucket = "${var.DEPLOY_TAG}-terminal.aztec.network"
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
      "Resource": "arn:aws:s3:::${var.DEPLOY_TAG}-terminal.aztec.network/*"
    }
  ]
}
EOF

  website {
    index_document = "index.html"
    error_document = "index.html"
  }
}

# AWS Cloudfront for caching.
resource "aws_cloudfront_distribution" "hummus_distribution" {
  origin {
    domain_name = aws_s3_bucket.hummus.website_endpoint
    origin_id   = "website"
    custom_origin_config {
      http_port              = "80"
      https_port             = "443"
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1", "TLSv1.1", "TLSv1.2"]
    }
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "Managed by Terraform"

  aliases = ["${var.DEPLOY_TAG}-terminal.aztec.network"]

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "website"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = data.terraform_remote_state.aztec2_iac.outputs.aws_acm_certificate_aztec_network_arn
    ssl_support_method  = "sni-only"
  }
}

resource "aws_route53_record" "a_record" {
  zone_id = data.terraform_remote_state.aztec2_iac.outputs.aws_route53_zone_id
  name    = "${var.DEPLOY_TAG}-terminal"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.hummus_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.hummus_distribution.hosted_zone_id
    evaluate_target_health = true
  }
}
