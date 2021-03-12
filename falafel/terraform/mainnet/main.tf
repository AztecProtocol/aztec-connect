terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/falafel/mainnet"
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
  name = "falafel-mainnet"

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
  creation_token                  = "falafel-mainnet-data-store"
  throughput_mode                 = "provisioned"
  provisioned_throughput_in_mibps = 20

  tags = {
    Name = "falafel-mainnet-data-store"
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
  family                   = "falafel-mainnet"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "2048"
  memory                   = "4096"
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
    "name": "falafel-mainnet",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel:latest",
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
        "name": "ETHEREUM_HOST",
        "value": "https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35"
      },
      {
        "name": "ETHEREUM_POLL_INTERVAL",
        "value": "10000"
      },
      {
        "name": "HALLOUMI_HOST",
        "value": "http://halloumi.local"
      },
      {
        "name": "ROLLUP_CONTRACT_ADDRESS",
        "value": "0x737901bea3eeb88459df9ef1BE8fF3Ae1B42A2ba"
      },
      {
        "name": "GAS_LIMIT",
        "value": "4000000"
      },
      {
        "name": "PRIVATE_KEY",
        "value": "${var.PRIVATE_KEY}"
      },
      {
        "name": "SERVER_AUTH_TOKEN",
        "value": "${var.SERVER_AUTH_TOKEN}"
      },
      {
        "name": "API_PREFIX",
        "value": "/falafel-mainnet"
      },
      {
        "name": "NUM_INNER_ROLLUP_TXS",
        "value": "28"
      },
      {
        "name": "NUM_OUTER_ROLLUP_PROOFS",
        "value": "4"
      },
      {
        "name": "FEE_GAS_PRICE",
        "value": "130000000000"
      },
      {
        "name": "BASE_TX_GAS",
        "value": "16000"
      },
      {
        "name": "PUBLISH_INTERVAL",
        "value": "14400"
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
        "awslogs-group": "/fargate/service/falafel-mainnet",
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
        "value": "falafel-mainnet"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/falafel-mainnet",
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
  name                               = "falafel-mainnet"
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
    container_name   = "falafel-mainnet"
    container_port   = 80
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.falafel.arn
    container_name = "falafel-mainnet"
    container_port = 80
  }

  task_definition = "${aws_ecs_task_definition.falafel.family}:${max(aws_ecs_task_definition.falafel.revision, data.aws_ecs_task_definition.falafel.revision)}"
}

# Logs
resource "aws_cloudwatch_log_group" "falafel_logs" {
  name              = "/fargate/service/falafel-mainnet"
  retention_in_days = "14"
}

# Configure ALB to route /falafel to server.
resource "aws_alb_target_group" "falafel" {
  name                 = "falafel-mainnet"
  port                 = "80"
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = data.terraform_remote_state.setup_iac.outputs.vpc_id
  deregistration_delay = 5

  health_check {
    path                = "/falafel-mainnet"
    matcher             = "200"
    interval            = 10
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
  }

  tags = {
    name = "falafel-mainnet"
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = data.terraform_remote_state.aztec2_iac.outputs.alb_listener_arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.falafel.arn
  }

  condition {
    path_pattern {
      values = ["/falafel-mainnet*"]
    }
  }
}
