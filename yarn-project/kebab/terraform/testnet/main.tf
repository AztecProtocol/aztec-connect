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

resource "aws_service_discovery_service" "kebab" {
  name = "${var.DEPLOY_TAG}-kebab"

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
resource "aws_efs_file_system" "kebab_data_store" {
  creation_token = "${var.DEPLOY_TAG}-kebab-data"

  tags = {
    Name = "${var.DEPLOY_TAG}-kebab-data"
  }

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }
}

resource "aws_efs_mount_target" "private_az1" {
  file_system_id  = aws_efs_file_system.kebab_data_store.id
  subnet_id       = data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id
  security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
}

resource "aws_efs_mount_target" "private_az2" {
  file_system_id  = aws_efs_file_system.kebab_data_store.id
  subnet_id       = data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
  security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
}

# Define task definition and service.
resource "aws_ecs_task_definition" "kebab" {
  family                   = "${var.DEPLOY_TAG}-kebab"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "2048"
  memory                   = "16384"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  volume {
    name = "efs-data-store"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.kebab_data_store.id
    }
  }

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-mainnet-fork",
    "image": "trufflesuite/ganache",
    "essential": true,
    "command": ["-p=8545", "-f=https://mainnet.infura.io/v3/${var.INFURA_API_KEY}", "--chain.chainId=0xA57EC", "--fork.blockNumber=15918000", "--database.dbPath=/data", "-h=0.0.0.0", "-l=12000000", "-a=0"],
    "mountPoints": [
      {
        "containerPath": "/data",
        "sourceVolume": "efs-data-store"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${aws_cloudwatch_log_group.kebab_logs.name}",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  },
  {
    "name": "${var.DEPLOY_TAG}-kebab",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/kebab:${var.DEPLOY_TAG}",
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
        "value": "${var.TEST_NET_RPC_URL}"
      },
      {
        "name": "FAUCET_OPERATOR",
        "value": "${var.FAUCET_OPERATOR_ADDRESS}"
      },
      {
        "name": "REDEPLOY",
        "value": "${var.REDEPLOY}"
      },
      {
        "name": "PRIVATE_KEY",
        "value": "${var.TEST_NET_ROOT_PRIVATE_KEY}"
      },
      {
        "name": "ROLLUP_PROVIDER_ADDRESS",
        "value": "0xA57EC00AfA2061565b9c8f4477E841F807222A6d"
      },
      {
        "name": "ADDITIONAL_PERMITTED_METHODS",
        "value": "net_version"
      }
    ],
    "mountPoints": [
      {
        "containerPath": "/usr/src/yarn-project/kebab/data",
        "sourceVolume": "efs-data-store"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${aws_cloudwatch_log_group.kebab_logs.name}",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }
]
DEFINITIONS
}

resource "aws_ecs_service" "kebab" {
  name                               = "${var.DEPLOY_TAG}-kebab"
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
    target_group_arn = aws_alb_target_group.kebab.arn
    container_name   = "${var.DEPLOY_TAG}-kebab"
    container_port   = 80
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.kebab.arn
    container_name = "${var.DEPLOY_TAG}-kebab"
    container_port = 80
  }

  task_definition = aws_ecs_task_definition.kebab.family
}

# Kebab Logs
resource "aws_cloudwatch_log_group" "kebab_logs" {
  name              = "/fargate/service/${var.DEPLOY_TAG}/kebab"
  retention_in_days = "14"
}

# Configure ALB to route kebab.aztec to server.
resource "aws_alb_target_group" "kebab" {
  name                 = "${var.DEPLOY_TAG}-kebab"
  port                 = "80"
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = data.terraform_remote_state.setup_iac.outputs.vpc_id
  deregistration_delay = 5

  health_check {
    path                = "/"
    matcher             = "200"
    interval            = 10
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
  }

  tags = {
    name = "${var.DEPLOY_TAG}-kebab"
  }
}

resource "aws_lb_listener_rule" "mainnet-fork" {
  listener_arn = data.terraform_remote_state.aztec2_iac.outputs.mainnet-fork-listener-id

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.kebab.arn
  }

  condition {
    host_header {
      values = ["${var.DEPLOY_TAG}-eth-host.aztec.network", "mainnet-fork.aztec.network"]
    }
  }
}


data "aws_alb" "aztec2" {
  arn = data.terraform_remote_state.aztec2_iac.outputs.alb_arn
}

# mainnet-fork DNS entry.
resource "aws_route53_record" "mainnet-fork" {
  zone_id = data.terraform_remote_state.aztec2_iac.outputs.aws_route53_zone_id
  name    = "${var.DEPLOY_TAG}-eth-host"
  type    = "A"
  alias {
    name                   = data.aws_alb.aztec2.dns_name
    zone_id                = data.aws_alb.aztec2.zone_id
    evaluate_target_health = true
  }
}
