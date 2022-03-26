
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
    error_document = "index.html"
  }
}

resource "aws_route53_record" "developers_record" {
  zone_id = data.terraform_remote_state.aztec2_iac.outputs.aws_route53_zone_id
  name    = "developers"
  type    = "A"
  alias {
    name                   = aws_s3_bucket.documentation.website_domain
    zone_id                = aws_s3_bucket.documentation.hosted_zone_id
    evaluate_target_health = true
  }
}
