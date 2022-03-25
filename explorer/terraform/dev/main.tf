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

# AWS S3 bucket for static hosting
resource "aws_s3_bucket" "block_explorer" {
  bucket = "${var.DEPLOY_TAG}-explorer.aztec.network"
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
      "Resource": "arn:aws:s3:::${var.DEPLOY_TAG}-explorer.aztec.network/*"
    }
  ]
}
EOF

  website {
    index_document = "index.html"
    error_document = "index.html"
  }
}

resource "aws_route53_record" "dashboard_record" {
  zone_id = data.terraform_remote_state.aztec2_iac.outputs.aws_route53_zone_id
  name    = "${var.DEPLOY_TAG}-explorer"
  type    = "A"
  alias {
    name                   = aws_s3_bucket.block_explorer.website_endpoint
    zone_id                = aws_s3_bucket.block_explorer.hosted_zone_id
    evaluate_target_health = false
  }
}
