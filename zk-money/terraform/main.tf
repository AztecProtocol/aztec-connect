
provider "aws" {
  profile = "default"
  region  = "eu-west-2"
}



terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/zk.money"
    region = "eu-west-2"
  }
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

resource "aws_acm_certificate" "zkmoney" {
  provider                  = aws.acm
  domain_name               = "zk.money"
  subject_alternative_names = ["*.zk.money"]
  validation_method         = "DNS"
  tags = {
    Name = "zk.money"
  }
}


# Certificate validation records.
resource "aws_route53_record" "zkmoney" {
  for_each = {
    for dvo in aws_acm_certificate.zkmoney.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.zkmoney.zone_id
}

#zkmoney SPF Record.
resource "aws_route53_record" "zkmoney_txt_spf" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = ""
  type    = "TXT"
  ttl     = 60
  records = ["v=spf1 mx include:_spf.google.com include:servers.mcsv.net -all"]
}


# zk.money DMARC Record.
resource "aws_route53_record" "zkmoney_txt_dmarc" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = "_dmarc"
  type    = "TXT"
  ttl     = 60
  records = ["v=DMARC1;p=reject;sp=reject;pct=100;adkim=s;aspf=s;rua=mailto:mailto:hello@aztecprotocol.com;ruf=mailto:mailto:hello@aztecprotocol.com;fo=0:1:d:s"]
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

resource "aws_s3_bucket" "zkmoney_redirect" {
  bucket = "www.zk.money"
  acl    = "public-read"

  website {
    redirect_all_requests_to = "https://zk.money"
  }
}

# AWS S3 bucket for static hosting
resource "aws_s3_bucket" "zkmoney" {
  bucket = "zk.money"
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
      "Resource": "arn:aws:s3:::zk.money/*"
    }
  ]
}

EOF

  website {
    index_document = "index.html"
    error_document = "index.html"
  }
}

# OLD UI bucket

# AWS S3 bucket for static hosting
resource "aws_s3_bucket" "old_zkmoney" {
  bucket = "old.zk.money"
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
      "Resource": "arn:aws:s3:::old.zk.money/*"
    }
  ]
}

EOF

  website {
    index_document = "index.html"
    error_document = "index.html"
  }
}
# AWS Cloudfront for old bucket

resource "aws_cloudfront_distribution" "old_zkmoney_distribution" {
  origin {
    domain_name = aws_s3_bucket.old_zkmoney.website_endpoint
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

  aliases = ["old.zk.money"]

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

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400

  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.zkmoney.arn
    ssl_support_method  = "sni-only"
  }
}


resource "aws_route53_record" "old_a_record" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = "old"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.old_zkmoney_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.old_zkmoney_distribution.hosted_zone_id
    evaluate_target_health = true
  }
}

# AWS Cloudfront for caching
resource "aws_cloudfront_distribution" "zkmoney_redirect_distribution" {
  
  origin {
    domain_name = aws_s3_bucket.zkmoney_redirect.website_endpoint
    origin_id   = "redirect"
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

  aliases = ["www.zk.money"]
  
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "redirect"

    forwarded_values {
      query_string = true

      cookies {
        forward = "none"
      }
    }
    viewer_protocol_policy = "allow-all"
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.zkmoney.arn
    ssl_support_method  = "sni-only"
  }
}



# AWS Cloudfront for caching
resource "aws_cloudfront_distribution" "zkmoney_distribution" {
  origin {
    domain_name = aws_s3_bucket.zkmoney.website_endpoint
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

  aliases = ["zk.money"]

  default_cache_behavior {

    target_origin_id = "website"
	  allowed_methods = ["GET", "HEAD"]
	  cached_methods = ["GET", "HEAD"]
    forwarded_values {
      query_string = true

      cookies {
        forward = "none"
      }
    }

    lambda_function_association {
      event_type   = "origin-response"
      lambda_arn   = aws_lambda_function.twitter_meta_lambda.qualified_arn
    }

    viewer_protocol_policy = "redirect-to-https"

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400

  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.zkmoney.arn
    ssl_support_method  = "sni-only"
  }
 
}

resource "aws_route53_record" "www_a_record" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = "www"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.zkmoney_redirect_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.zkmoney_redirect_distribution.hosted_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "root_a_record" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = "zk.money"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.zkmoney_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.zkmoney_distribution.hosted_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "root_aaaa_record" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = "zk.money"
  type    = "AAAA"
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
	name_prefix = var.lambda_function_name
	assume_role_policy = data.aws_iam_policy_document.lambda.json
}

resource "aws_iam_role_policy_attachment" "basic" {
	role = aws_iam_role.main.name
	policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_permission" "allow_cloudfront_invocation" {
  statement_id   = "AllowExecutionFromCloudFront"
  action         = "lambda:InvokeFunction"
  function_name  = "${aws_lambda_function.twitter_meta_lambda.function_name}"
  principal      = "edgelambda.amazonaws.com"
  source_arn = aws_cloudfront_distribution.zkmoney_distribution.arn
}

resource "aws_lambda_permission" "allow_cloudfront" {
  statement_id   = "AllowGetFromCloudFront"
  action         = "lambda:GetFunction"
  function_name  = "${aws_lambda_function.twitter_meta_lambda.function_name}"
  principal      = "edgelambda.amazonaws.com"
  source_arn = aws_cloudfront_distribution.zkmoney_distribution.arn

}


variable "lambda_function_name" {
  default = "twitter_meta_lambda"
}

data "archive_file" "zipit" {
  type        = "zip"
  source_dir = "../lambda"
  output_path = "twitter_lambda.zip"
}

resource "aws_lambda_function" "twitter_meta_lambda" {
  filename      = "twitter_lambda.zip"
  function_name = var.lambda_function_name
	role = aws_iam_role.main.arn
  handler       = "index.main"
  provider      = aws.acm
  source_code_hash = "${data.archive_file.zipit.output_base64sha256}"
  runtime = "nodejs12.x"
  publish = true
}


