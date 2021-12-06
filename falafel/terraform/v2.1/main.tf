terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec/v2.1/falafel"
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

resource "aws_service_discovery_service" "falafel" {
  name = "falafel-defi-bridge"

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
resource "aws_efs_file_system" "falafel_data_store" {
  creation_token                  = "falafel-defi-bridge-data-store"
  throughput_mode                 = "provisioned"
  provisioned_throughput_in_mibps = 20

  tags = {
    Name = "falafel-defi-bridge-data-store"
  }

  lifecycle_policy {
    transition_to_ia = "AFTER_14_DAYS"
  }
}

resource "aws_efs_mount_target" "private_az1" {
  file_system_id  = aws_efs_file_system.falafel_data_store.id
  subnet_id       = data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id
  security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
}

resource "aws_efs_mount_target" "private_az2" {
  file_system_id  = aws_efs_file_system.falafel_data_store.id
  subnet_id       = data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
  security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
}

# Define task definition and service.
resource "aws_ecs_task_definition" "falafel" {
  family                   = "falafel-defi-bridge"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "4096"
  memory                   = "30720"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  volume {
    name = "efs-data-store"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.falafel_data_store.id
    }
  }

  container_definitions = <<DEFINITIONS
[
  {
    "name": "falafel-defi-bridge",
    "image": "278380418400.dkr.ecr.us-east-2.amazonaws.com/falafel:cache-defi-bridge-project",
    "essential": true,
    "memoryReservation": 30464,
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
        "name": "ETHEREUM_HOST",
        "value": "http://ethereum.aztec.network:10545"
      },
      {
        "name": "ROLLUP_CONTRACT_ADDRESS",
        "value": "0xA7b3Fe0ac95310b65Ec17CAc64cF6a07cD173A19"
      },
      {
        "name": "PRICE_FEED_CONTRACT_ADDRESSES",
        "value": "0xDeFBe0fC6704F41419B7c1EF33CB7f9B2a8De21d,0x84CF7b5C00dAe33CaB79F40AeE13E7a2C2f43d83"
      },
      {
        "name": "GAS_LIMIT",
        "value": "8000000"
      },
      {
        "name": "PRIVATE_KEY",
        "value": "0x1e76840afc5763c3fe78574ab4b1e2fa0f7b9e5b866a5bfae60cfa17e80d5bdf"
      },
      {
        "name": "API_PREFIX",
        "value": "/falafel-defi-bridge"
      },
      {
        "name": "NUM_INNER_ROLLUP_TXS",
        "value": "1"
      },
      {
        "name": "NUM_OUTER_ROLLUP_PROOFS",
        "value": "2"
      },
      {
        "name": "MAX_FEE_GAS_PRICE",
        "value": "250000000000"
      },
      {
        "name": "FEE_GAS_PRICE_MULTIPLIER",
        "value": "2.5"
      },
      {
        "name": "PROVIDER_GAS_PRICE_MULTIPLIER",
        "value": "1.2"
      },
      {
        "name": "BASE_TX_GAS",
        "value": "16000"
      },
      {
        "name": "PUBLISH_INTERVAL",
        "value": "60"
      },
      {
        "name": "MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW",
        "value": "1"
      }
    ],
    "mountPoints": [
      {
        "containerPath": "/usr/src/falafel/data",
        "sourceVolume": "efs-data-store"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/falafel-defi-bridge",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }
]
DEFINITIONS
}

data "aws_ecs_task_definition" "falafel" {
  task_definition = aws_ecs_task_definition.falafel.family
}

resource "aws_ecs_service" "falafel" {
  name                               = "falafel-defi-bridge"
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
    target_group_arn = aws_alb_target_group.falafel.arn
    container_name   = "falafel-defi-bridge"
    container_port   = 80
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.falafel.arn
    container_name = "falafel-defi-bridge"
    container_port = 80
  }

  task_definition = "${aws_ecs_task_definition.falafel.family}:${max(aws_ecs_task_definition.falafel.revision, data.aws_ecs_task_definition.falafel.revision)}"
}

# Logs
resource "aws_cloudwatch_log_group" "falafel_logs" {
  name              = "/fargate/service/falafel-defi-bridge"
  retention_in_days = "14"
}

# Configure ALB to route /falafel to server.
resource "aws_alb_target_group" "falafel" {
  name                 = "falafel-defi-bridge"
  port                 = "80"
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = data.terraform_remote_state.setup_iac.outputs.vpc_id
  deregistration_delay = 5

  health_check {
    path                = "/falafel-defi-bridge"
    matcher             = "200"
    interval            = 10
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
  }

  tags = {
    name = "falafel-defi-bridge"
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = data.terraform_remote_state.aztec2_iac.outputs.alb_listener_arn
  priority     = 99

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.falafel.arn
  }

  condition {
    path_pattern {
      values = ["/falafel-defi-bridge*"]
    }
  }
}
