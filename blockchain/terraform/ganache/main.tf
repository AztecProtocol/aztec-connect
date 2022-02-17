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

resource "aws_service_discovery_service" "ganache" {
  name = "${var.DEPLOY_TAG}-ganache"

  health_check_custom_config {
    failure_threshold = 1
  }

  dns_config {
    namespace_id = data.terraform_remote_state.setup_iac.outputs.local_service_discovery_id

    dns_records {
      ttl  = 60
      type = "A"
    }

    dns_records {
      ttl  = 60
      type = "SRV"
    }

    routing_policy = "MULTIVALUE"
  }

  # Terraform just fails if this resource changes and you have registered instances.
  provisioner "local-exec" {
    when    = destroy
    command = "${path.module}/../servicediscovery-drain.sh ${self.id}"
  }
}

# Configure an EFS filesystem.
resource "aws_efs_file_system" "ganache" {
  creation_token                  = "${var.DEPLOY_TAG}-ganache-data"
  throughput_mode                 = "provisioned"
  provisioned_throughput_in_mibps = 20

  tags = {
    Name = "${var.DEPLOY_TAG}-ganache-data"
  }

  lifecycle_policy {
    transition_to_ia = "AFTER_14_DAYS"
  }
}

resource "aws_efs_mount_target" "private_az1" {
  file_system_id  = aws_efs_file_system.ganache.id
  subnet_id       = data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id
  security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
}

resource "aws_efs_mount_target" "private_az2" {
  file_system_id  = aws_efs_file_system.ganache.id
  subnet_id       = data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
  security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
}

# Define task definition and service.
resource "aws_ecs_task_definition" "ganache" {
  family                   = "${var.DEPLOY_TAG}-ganache"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  volume {
    name = "efs-data-store"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.ganache.id
    }
  }

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-ganache",
    "image": "trufflesuite/ganache",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 80
      }
    ],
    "command": ["-p=80", "-f", "--chain.chainId=0xA57EC", "--fork.blockNumber=14000000", "--database.dbPath=/data", "-h=0.0.0.0", "-l=12000000", "-a=1", "-e=1000000", "-m=goat hungry trial bike tool thunder model scrap later hood walnut try"],
    "mountPoints": [
      {
        "containerPath": "/data",
        "sourceVolume": "efs-data-store"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${aws_cloudwatch_log_group.ganache.name}",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }
]
DEFINITIONS
}

resource "aws_ecs_service" "ganache" {
  name                               = "${var.DEPLOY_TAG}-ganache"
  cluster                            = data.terraform_remote_state.setup_iac.outputs.ecs_cluster_id
  launch_type                        = "FARGATE"
  desired_count                      = 1
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0
  platform_version                   = "1.4.0"

  network_configuration {
    subnets = [
      data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id,
      data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
    ]
    security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.ganache.arn
    container_name   = "${var.DEPLOY_TAG}-ganache"
    container_port   = 80
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.ganache.arn
    container_name = "${var.DEPLOY_TAG}-ganache"
    container_port = 80
  }

  task_definition = aws_ecs_task_definition.ganache.family
}

# Logs
resource "aws_cloudwatch_log_group" "ganache" {
  name              = "/fargate/service/${var.DEPLOY_TAG}/ganache"
  retention_in_days = "14"
}

# Configure ALB.
resource "aws_alb_listener" "http_listener" {
  load_balancer_arn = data.terraform_remote_state.aztec2_iac.outputs.alb_arn
  port              = "8545"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.ganache.arn
  }
}

resource "aws_alb_target_group" "ganache" {
  name                 = "${var.DEPLOY_TAG}-ganache"
  port                 = "8545"
  protocol             = "HTTP"
  target_type          = "ip"
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
resource "aws_route53_record" "aztec2" {
  zone_id = data.terraform_remote_state.aztec2_iac.outputs.aws_route53_zone_id
  name    = "mainnet-fork"
  type    = "CNAME"
  ttl     = "300"
  records = ["api.aztec.network"]
}
