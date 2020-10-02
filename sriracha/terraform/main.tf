terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/sriracha"
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

provider "aws" {
  profile = "default"
  region  = "eu-west-2"
}

resource "aws_service_discovery_service" "sriracha" {
  name = "sriracha"

  health_check_custom_config {
    failure_threshold = 1
  }

  dns_config {
    namespace_id = data.terraform_remote_state.setup_iac.outputs.local_service_discovery_id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }
}

# Configure an EFS filesystem for holding transcripts and state data, mountable in each AZ.
resource "aws_efs_file_system" "sriracha_data_store" {
  creation_token = "sriracha-data-store"

  tags = {
    Name = "sriracha-data-store"
  }

  lifecycle_policy {
    transition_to_ia = "AFTER_14_DAYS"
  }
}

resource "aws_efs_mount_target" "private_az1" {
  file_system_id  = aws_efs_file_system.sriracha_data_store.id
  subnet_id       = data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id
  security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
}

resource "aws_efs_mount_target" "private_az2" {
  file_system_id  = aws_efs_file_system.sriracha_data_store.id
  subnet_id       = data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
  security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
}

# Define task definition and service.
resource "aws_ecs_task_definition" "sriracha" {
  family                   = "sriracha"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  volume {
    name = "sriracha-efs-data-store"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.sriracha_data_store.id
      root_directory = "/"
    }
  }

  container_definitions = <<DEFINITIONS
[
  {
    "name": "sriracha",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/sriracha:latest",
    "essential": true,
    "memoryReservation": 256,
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
        "name": "NETWORK",
        "value": "ropsten"
      },
      {
        "name": "INFURA_API_KEY",
        "value": "${var.INFURA_API_KEY}"
      },
      {
        "name": "ROLLUP_CONTRACT_ADDRESS",
        "value": "0x5dBc80672e253fd8DEBE59C5deD82E855BC7d88A"
      },
      {
        "name": "API_PREFIX",
        "value": "/sriracha"
      }
    ],
    "mountPoints": [
      {
        "containerPath": "/usr/src/sriracha/data",
        "sourceVolume": "sriracha-efs-data-store"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/sriracha",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }
]
DEFINITIONS
}

data "aws_ecs_task_definition" "sriracha" {
  task_definition = aws_ecs_task_definition.sriracha.family
}

resource "aws_ecs_service" "sriracha" {
  name                               = "sriracha"
  cluster                            = data.terraform_remote_state.setup_iac.outputs.ecs_cluster_id
  launch_type                        = "FARGATE"
  desired_count                      = "1"
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
    target_group_arn = aws_alb_target_group.sriracha.arn
    container_name   = "sriracha"
    container_port   = 80
  }

  service_registries {
    registry_arn = aws_service_discovery_service.sriracha.arn
  }

  task_definition = "${aws_ecs_task_definition.sriracha.family}:${max(aws_ecs_task_definition.sriracha.revision, data.aws_ecs_task_definition.sriracha.revision)}"
}

# Logs
resource "aws_cloudwatch_log_group" "sriracha_logs" {
  name              = "/fargate/service/sriracha"
  retention_in_days = "14"
}

# Configure ALB to route /sriracha to server.
resource "aws_alb_target_group" "sriracha" {
  name                 = "sriracha"
  port                 = "80"
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = data.terraform_remote_state.setup_iac.outputs.vpc_id
  deregistration_delay = 5

  health_check {
    path              = "/sriracha"
    matcher           = "200"
    interval          = 60
    healthy_threshold = 2
    timeout           = 3
  }

  tags = {
    name = "sriracha"
  }
}

resource "aws_lb_listener_rule" "sriracha" {
  listener_arn = data.terraform_remote_state.aztec2_iac.outputs.alb_listener_arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.sriracha.arn
  }

  condition {
    path_pattern {
      values = ["/sriracha/*"]
    }
  }
}
