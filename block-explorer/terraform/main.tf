
provider "aws" {
  profile = "default"
  region  = "us-east-1"
}

terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/block-explorer"
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


# AWS S3 bucket for static hosting
resource "aws_s3_bucket" "block_explorer" {
  bucket = "dashboard.aztec.network"
  acl = "public-read"


  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT","POST"]
    allowed_origins = ["*"]
    expose_headers = ["ETag"]
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
      "Resource": "arn:aws:s3:::block-explorer.aztec.network/*"
    }
  ]
}
EOF

  website {
    index_document = "index.html"
    error_document = "error.html"
  }
}


# AWS Cloudfront for caching
resource "aws_cloudfront_distribution" "block_explorer_distribution" {
  origin {
    domain_name = "${aws_s3_bucket.block_explorer.bucket}.s3.amazonaws.com"
    origin_id   = "website"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Managed by Terraform"
  default_root_object = "index.html"

  aliases = ["dashboard.aztec.network"]

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

    viewer_protocol_policy = "allow-all"
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
    acm_certificate_arn = data.aws_acm_certificate.block_explorer_cert.arn
    ssl_support_method = "sni-only"
  }
}


resource "aws_route53_record" "main-c-name" {
  zone_id = data.terraform_remote_state.setup_iac.outputs.aws_route53_zone_id
  name = "developers"
  type = "CNAME"
  ttl = "300"
  records = ["${aws_cloudfront_distribution.block_explorer_distribution.domain_name}"]
}

data "aws_acm_certificate" "block_explorer_cert" {
  domain   = "*.aztec.network"
  statuses = ["ISSUED"]
}