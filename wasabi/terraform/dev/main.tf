terraform {
  backend "s3" {
    bucket = "aztec-terraform"
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

data "terraform_remote_state" "blockchain" {
  backend = "s3"
  config = {
    bucket = "aztec-terraform"
    key    = "${var.DEPLOY_TAG}/blockchain"
    region = "eu-west-2"
  }
}

provider "aws" {
  profile = "default"
  region  = "eu-west-2"
}

# Define task definition and service.
resource "aws_ecs_task_definition" "wasabi" {
  family                   = "${var.DEPLOY_TAG}-wasabi"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "4096"
  memory                   = "8192"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn


  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-wasabi",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/wasabi:${var.DEPLOY_TAG}",
    "essential": true,
    "memoryReservation": 8192,
    "portMappings": [
      {
        "containerPort": 80
      }
    ],
    "environment": [
      {
        "name": "NODE_ENV",
        "value": "production"
      },
      {
        "name": "ETHEREUM_HOST",
        "value": "http://ethereum.aztec.network:10545"
      },
      {
        "name": "NUM_AGENTS",
        "value": "70"
      },
      {
        "name": "LOOP",
        "value": "1"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/${var.DEPLOY_TAG}/wasabi",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }
]
DEFINITIONS
}

resource "aws_ecs_service" "wasabi" {
  name                               = "${var.DEPLOY_TAG}-wasabi"
  cluster                            = data.terraform_remote_state.setup_iac.outputs.ecs_cluster_id
  launch_type                        = "FARGATE"
  desired_count                      = 0
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

  task_definition = aws_ecs_task_definition.wasabi.family
}

# Logs
resource "aws_cloudwatch_log_group" "wasabi_logs" {
  name              = "/fargate/service/${var.DEPLOY_TAG}/wasabi"
  retention_in_days = "14"
}
