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

resource "aws_service_discovery_service" "nym-gateway" {
  name = "${var.DEPLOY_TAG}-nym-gateway"

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
resource "aws_efs_file_system" "nym-gateway_data_store" {
  creation_token = "${var.DEPLOY_TAG}-nym-gateway-data"

  tags = {
    Name = "${var.DEPLOY_TAG}-nym-gateway-data"
  }

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }
}

resource "aws_efs_mount_target" "private_az1" {
  file_system_id  = aws_efs_file_system.nym-gateway_data_store.id
  subnet_id       = data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id
  security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
}


# Define task definition and service.
resource "aws_ecs_task_definition" "nym-gateway" {
  family                   = "${var.DEPLOY_TAG}-nym-gateway"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  volume {
    name = "efs-data-store"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.nym-gateway_data_store.id
    }
  }

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-nym-gateway",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/nym-gateway:${var.DEPLOY_TAG}",
    "essential": true,
    "memoryReservation": 256,
    "portMappings": [
      {
        "containerPort": 80
      }
    ],
    "environment": [
      {
        "name": "PORT",
        "value": "80"
      },
      {
        "name": "API_PREFIX",
        "value": "/${var.DEPLOY_TAG}/nym-gateway"
      },
      {
        "name": "NYM_PORT",
        "value": "1977"
      },
      {
        "name": "DEPLOY_TAG",
        "value": "${var.DEPLOY_TAG}"
      }
    ],
    "mountPoints": [
      {
        "containerPath": "/root/.nym",
        "sourceVolume": "efs-data-store"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${aws_cloudwatch_log_group.nym-gateway_logs.name}",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  },
  {
    "name": "metrics",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/metrics-sidecar:latest",
    "essential": false,
    "memoryReservation": 256,
    "portMappings": [
      {
        "containerPort": 9545
      }
    ],
    "environment": [
      {
        "name": "DEPLOY_TAG",
        "value": "${var.DEPLOY_TAG}"
      },
      {
        "name": "SERVICE",
        "value": "${var.DEPLOY_TAG}-nym-gateway"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${aws_cloudwatch_log_group.nym-gateway_logs.name}",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }
]
DEFINITIONS
}




resource "aws_ecs_service" "nym-gateway" {
  name                               = "${var.DEPLOY_TAG}-nym-gateway"
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
    target_group_arn = aws_alb_target_group.nym-gateway.arn
    container_name   = "${var.DEPLOY_TAG}-nym-gateway"
    container_port   = 80
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.nym-gateway.arn
    container_name = "${var.DEPLOY_TAG}-nym-gateway"
    container_port = 80
  }

  task_definition = aws_ecs_task_definition.nym-gateway.family
}

# Gateway Logs
resource "aws_cloudwatch_log_group" "nym-gateway_logs" {
  name              = "/fargate/service/${var.DEPLOY_TAG}/nym-gatweay"
  retention_in_days = "14"
}

# Configure ALB to route /nym-gateway to server.
resource "aws_alb_target_group" "nym-gateway" {
  name                 = "${var.DEPLOY_TAG}-nym-gateway"
  port                 = "80"
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = data.terraform_remote_state.setup_iac.outputs.vpc_id
  deregistration_delay = 5

  health_check {
    path                = "/${var.DEPLOY_TAG}/nym-gateway"
    matcher             = "200"
    interval            = 10
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
  }

  tags = {
    name = "${var.DEPLOY_TAG}-nym-gateway"
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = data.terraform_remote_state.aztec2_iac.outputs.alb_listener_arn
  priority     = 451

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.nym-gateway.arn
  }

  condition {
    path_pattern {
      values = ["/${var.DEPLOY_TAG}/nym-gateway*"]
    }
  }
}
