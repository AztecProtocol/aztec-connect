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

# Node instance.
resource "aws_instance" "ganache" {
  ami                    = "ami-00108fa4bd389cbd2"
  instance_type          = "m5.large"
  subnet_id              = data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id
  vpc_security_group_ids = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
  iam_instance_profile   = data.terraform_remote_state.setup_iac.outputs.ecs_instance_profile_name
  key_name               = data.terraform_remote_state.setup_iac.outputs.ecs_instance_key_pair_name
  availability_zone      = "eu-west-2a"
  ebs_optimized          = true

  tags = {
    Name       = "mainnet-fork"
    prometheus = ""
  }
}

# Volume for chain data.
resource "aws_ebs_volume" "chaindata" {
  availability_zone = "eu-west-2a"
  type              = "gp3"
  size              = 8

  tags = {
    Name = "mainnet-fork"
  }
}

resource "aws_volume_attachment" "ebs_att" {
  device_name = "/dev/sdh"
  volume_id   = aws_ebs_volume.chaindata.id
  instance_id = aws_instance.ganache.id
}

# Configure ALB.
resource "aws_alb_listener" "http_listener" {
  load_balancer_arn = data.terraform_remote_state.aztec2_iac.outputs.alb_arn
  port              = "8545"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.terraform_remote_state.aztec2_iac.outputs.aws_acm_certificate_aztec_network_eu_cert_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.ganache.arn
  }
}

resource "aws_alb_target_group" "ganache" {
  name                 = "${var.DEPLOY_TAG}-ganache"
  port                 = "8545"
  protocol             = "HTTP"
  target_type          = "instance"
  vpc_id               = data.terraform_remote_state.setup_iac.outputs.vpc_id
  deregistration_delay = 5

  health_check {
    path                = "/"
    matcher             = "404"
    interval            = 10
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
  }

  tags = {
    name = "${var.DEPLOY_TAG}-ganache"
  }
}

resource "aws_alb_target_group_attachment" "ganache" {
  target_group_arn = aws_alb_target_group.ganache.arn
  target_id        = aws_instance.ganache.id
  port             = 80
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = data.terraform_remote_state.aztec2_iac.outputs.alb_listener_arn

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.ganache.arn
  }

  condition {
    host_header {
      values = ["mainnet-fork.aztec.network"]
    }
  }
}

# Permit port 8545 on public subnet.
resource "aws_security_group_rule" "ganache" {
  type              = "ingress"
  from_port         = 8545
  to_port           = 8545
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = data.terraform_remote_state.setup_iac.outputs.security_group_public_id
}

# DNS entry. Point it to the load balancer at api.aztec.network.
resource "aws_route53_record" "ganache" {
  zone_id = data.terraform_remote_state.aztec2_iac.outputs.aws_route53_zone_id
  name    = "mainnet-fork"
  type    = "CNAME"
  ttl     = "300"
  records = ["api.aztec.network"]
}
