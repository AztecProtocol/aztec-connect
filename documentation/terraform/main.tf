
provider "aws" {
  profile = "default"
  region  = "eu-west-2"
}

terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/documentation"
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
resource "aws_s3_bucket" "documentation" {
  bucket = "developers.aztec.network"
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
      "Resource": "arn:aws:s3:::developers.aztec.network/*"
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
resource "aws_cloudfront_distribution" "documentation_distribution" {
  origin {
    domain_name = aws_s3_bucket.documentation.bucket_regional_domain_name
    origin_id   = "website"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Managed by Terraform"
  default_root_object = "index.html"

  aliases = ["developers.aztec.network"]

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

resource "aws_route53_record" "developers_record" {
  zone_id = data.terraform_remote_state.aztec2_iac.outputs.aws_route53_zone_id
  name    = "developers"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.documentation_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.documentation_distribution.hosted_zone_id
    evaluate_target_health = true
  }
}