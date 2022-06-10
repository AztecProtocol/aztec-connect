terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/docs/dns"
    region = "eu-west-2"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "3.74.2"
    }
  }
}

provider "aws" {
  profile = "default"
  region  = "eu-west-2"
}

data "terraform_remote_state" "aztec2_iac" {
  backend = "s3"
  config = {
    bucket = "aztec-terraform"
    key    = "aztec2/iac"
    region = "eu-west-2"
  }
}

# DNS entry. Point it to the load balancer at api.aztec.network.
resource "aws_route53_record" "docs" {
  zone_id = data.terraform_remote_state.aztec2_iac.outputs.aws_route53_zone_id
  name    = "docs"
  type    = "CNAME"
  ttl     = "300"
  records = ["aztec-connect-prod-docs.aztec.network"]
}
