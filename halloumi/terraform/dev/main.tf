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

resource "aws_service_discovery_service" "halloumi" {
  name = "${var.DEPLOY_TAG}-halloumi"

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

# Create EC2 instance.
/*
resource "aws_instance" "container_instance_az1" {
  ami                    = "ami-0cd4858f2b923aa6b"
  instance_type          = "r5.4xlarge"
  subnet_id              = data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id
  vpc_security_group_ids = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
  iam_instance_profile   = data.terraform_remote_state.setup_iac.outputs.ecs_instance_profile_name
  key_name               = data.terraform_remote_state.setup_iac.outputs.ecs_instance_key_pair_name
  availability_zone      = "eu-west-2a"

  root_block_device {
    volume_type = "gp3"
    volume_size = 300
    throughput  = 1000
    iops        = 4000
  }

  user_data = <<USER_DATA
#!/bin/bash
echo ECS_CLUSTER=${data.terraform_remote_state.setup_iac.outputs.ecs_cluster_name} >> /etc/ecs/ecs.config
echo 'ECS_INSTANCE_ATTRIBUTES={"group": "${var.DEPLOY_TAG}-halloumi"}' >> /etc/ecs/ecs.config
USER_DATA

  tags = {
    Name       = "${var.DEPLOY_TAG}-halloumi-az1"
    prometheus = ""
  }
}
*/

# Define task definition and service.
resource "aws_ecs_task_definition" "halloumi" {
  family                   = "${var.DEPLOY_TAG}-halloumi"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "4096"
  memory                   = "8192"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-halloumi",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/halloumi:${var.DEPLOY_TAG}",
    "essential": true,
    "memoryReservation": 3840,
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
        "name": "PORT",
        "value": "80"
      },
      {
        "name": "JOB_SERVER_URL",
        "value": "http://${var.DEPLOY_TAG}-falafel.local:8082"
      },
      {
        "name": "NUM_INNER_ROLLUP_TXS",
        "value": "3"
      },
      {
        "name": "NUM_OUTER_ROLLUP_PROOFS",
        "value": "2"
      },
      {
        "name": "PROVERLESS",
        "value": "true"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/${var.DEPLOY_TAG}/halloumi",
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
        "name": "SERVICE",
        "value": "${var.DEPLOY_TAG}-halloumi"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/${var.DEPLOY_TAG}/halloumi",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }
]
DEFINITIONS
}

resource "aws_ecs_service" "halloumi" {
  name                               = "${var.DEPLOY_TAG}-halloumi"
  cluster                            = data.terraform_remote_state.setup_iac.outputs.ecs_cluster_id
  launch_type                        = "FARGATE"
  desired_count                      = 2
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

  service_registries {
    registry_arn   = aws_service_discovery_service.halloumi.arn
    container_name = "${var.DEPLOY_TAG}-halloumi"
    container_port = 80
  }

  task_definition = aws_ecs_task_definition.halloumi.family
}

# Logs
resource "aws_cloudwatch_log_group" "halloumi_logs" {
  name              = "/fargate/service/${var.DEPLOY_TAG}/halloumi"
  retention_in_days = "14"
}
