terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/zk-money/dns"
    region = "eu-west-2"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "3.74.2"
    }
  }
}

data "terraform_remote_state" "aztec_connect_prod_zk_money" {
  backend = "s3"
  config = {
    bucket = "aztec-terraform"
    key    = "aztec-connect-prod/zk-money"
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

# zk.money SPF record.
resource "aws_route53_record" "zkmoney_txt_spf" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = ""
  type    = "TXT"
  ttl     = 60
  records = ["v=spf1 mx include:_spf.google.com include:servers.mcsv.net -all"]
}

# zk.money DMARC record.
resource "aws_route53_record" "zkmoney_txt_dmarc" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = "_dmarc"
  type    = "TXT"
  ttl     = 60
  records = ["v=DMARC1;p=reject;sp=reject;pct=100;adkim=s;aspf=s;rua=mailto:mailto:hello@aztecprotocol.com;ruf=mailto:mailto:hello@aztecprotocol.com;fo=0:1:d:s"]
}

# redirect for www > zk.money

resource "aws_s3_bucket" "zkmoney_redirect" {
  bucket = "www.zk.money"
  acl    = "public-read"

  website {
    redirect_all_requests_to = "https://zk.money"
  }
}

# AWS Cloudfront for caching on the redirect bucket
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
  aliases         = ["www.zk.money"]

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
    acm_certificate_arn = aws_acm_certificate.zkmoney.arn
    ssl_support_method  = "sni-only"
  }
}

# set up the main website redirects


resource "aws_route53_record" "root_a_record" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = "zk.money"
  type    = "A"
  alias {
    name                   = data.terraform_remote_state.aztec_connect_prod_zk_money.outputs.cloudfront_domain_name
    zone_id                = data.terraform_remote_state.aztec_connect_prod_zk_money.outputs.hosted_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "root_aaaa_record" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = "zk.money"
  type    = "AAAA"
  alias {
    name                   = data.terraform_remote_state.aztec_connect_prod_zk_money.outputs.cloudfront_domain_name
    zone_id                = data.terraform_remote_state.aztec_connect_prod_zk_money.outputs.hosted_zone_id
    evaluate_target_health = true
  }
}

# A Record to point to the redirect bucket above

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



# OLD zk.money config
resource "aws_cloudfront_distribution" "zkmoney_distribution" {
  origin {
    domain_name = "zk.money.s3-website.eu-west-2.amazonaws.com"
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
  aliases         = ["old.zk.money"]


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
    acm_certificate_arn = aws_acm_certificate.zkmoney.arn
    ssl_support_method  = "sni-only"
  }
}

resource "aws_route53_record" "old_a_record" {
  zone_id = data.aws_route53_zone.zkmoney.zone_id
  name    = "old"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.zkmoney_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.zkmoney_distribution.hosted_zone_id
    evaluate_target_health = true
  }
}
