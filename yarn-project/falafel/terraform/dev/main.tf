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

data "terraform_remote_state" "contracts" {
  backend = "s3"
  config = {
    bucket = "aztec-terraform"
    key    = "${var.DEPLOY_TAG}/contracts"
    region = "eu-west-2"
  }
}

provider "aws" {
  profile = "default"
  region  = "eu-west-2"
}

resource "aws_service_discovery_service" "falafel" {
  name = "${var.DEPLOY_TAG}-falafel"

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

# Configure a Postgres db.
resource "aws_db_subnet_group" "default" {
  name = "${var.DEPLOY_TAG}-falafel-db-subnet"
  subnet_ids = [
    data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id,
    data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id,
  ]

  tags = {
    Name = "${var.DEPLOY_TAG}-falafel-db-subnet"
  }
}

resource "aws_db_instance" "postgres" {
  allocated_storage      = 8
  db_subnet_group_name   = aws_db_subnet_group.default.name
  engine                 = "postgres"
  engine_version         = "13.10"
  identifier             = "${var.DEPLOY_TAG}-falafel-db"
  instance_class         = "db.t4g.large"
  name                   = "falafel"
  password               = "password"
  port                   = 5432
  storage_type           = "gp2"
  username               = "username"
  vpc_security_group_ids = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
  skip_final_snapshot    = true
}

# Configure an EFS filesystem.
resource "aws_efs_file_system" "falafel_data_store" {
  creation_token                  = "${var.DEPLOY_TAG}-falafel-data"
  throughput_mode                 = "provisioned"
  provisioned_throughput_in_mibps = 20

  tags = {
    Name = "${var.DEPLOY_TAG}-falafel-data"
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
  family                   = "${var.DEPLOY_TAG}-falafel"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn
  task_role_arn            = data.terraform_remote_state.aztec2_iac.outputs.cloudwatch_logging_ecs_role_arn

  volume {
    name = "efs-data-store"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.falafel_data_store.id
    }
  }

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-falafel",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel:${var.DEPLOY_TAG}",
    "essential": true,
    "memoryReservation": 3776,
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
        "name": "DB_URL",
        "value": "postgres://username:password@${aws_db_instance.postgres.endpoint}"
      },
      {
        "name": "ETHEREUM_HOST",
        "value": "https://${var.DEPLOY_TAG}-eth-host.aztec.network:8545/${var.DEV_KEBAB_API_KEY}"
      },
      {
        "name": "PRIVATE_KEY",
        "value": "${var.DEV_FORK_ROLLUP_PROVIDER_PRIVATE_KEY}"
      },
      {
        "name": "SERVER_AUTH_TOKEN",
        "value": "${var.DEV_SERVER_AUTH_TOKEN}"
      },
      {
        "name": "API_PREFIX",
        "value": "/${var.DEPLOY_TAG}/falafel"
      },
      {
        "name": "NUM_INNER_ROLLUP_TXS",
        "value": "28"
      },
      {
        "name": "NUM_OUTER_ROLLUP_PROOFS",
        "value": "32"
      },
      {
        "name": "MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW",
        "value": "1"
      },
      {
        "name": "PROVERLESS",
        "value": "true"
      },
      {
        "name": "ROLLUP_CONTRACT_ADDRESS",
        "value": "${data.terraform_remote_state.contracts.outputs.rollup_contract_address}"
      },
      {
        "name": "PERMIT_HELPER_CONTRACT_ADDRESS",
        "value": "${data.terraform_remote_state.contracts.outputs.permit_helper_contract_address}"
      },
      {
        "name": "FEE_DISTRIBUTOR_ADDRESS",
        "value": "${data.terraform_remote_state.contracts.outputs.fee_distributor_address}"
      },
      {
        "name": "PRICE_FEED_CONTRACT_ADDRESSES",
        "value": "${data.terraform_remote_state.contracts.outputs.price_feed_contract_addresses}"
      },
      {
        "name": "BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS",
        "value": "${data.terraform_remote_state.contracts.outputs.bridge_data_provider_contract_address}"
      },
      {
        "name": "INITIAL_RUNTIME_CONFIG_PATH",
        "value": "./config/dev_testnet_initial_config.json"
      },
      {
        "name": "EXIT_ONLY",
        "value": "true"
      }
    ],
    "mountPoints": [
      {
        "containerPath": "/usr/src/yarn-project/falafel/data",
        "sourceVolume": "efs-data-store"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/${var.DEPLOY_TAG}/falafel",
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
        "value": "${var.DEPLOY_TAG}-falafel"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/${var.DEPLOY_TAG}/falafel",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }
]
DEFINITIONS
}

resource "aws_ecs_service" "falafel" {
  name                               = "${var.DEPLOY_TAG}-falafel"
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
    container_name   = "${var.DEPLOY_TAG}-falafel"
    container_port   = 80
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.falafel.arn
    container_name = "${var.DEPLOY_TAG}-falafel"
    container_port = 80
  }

  task_definition = aws_ecs_task_definition.falafel.family
}

# Logs
resource "aws_cloudwatch_log_group" "falafel_logs" {
  name              = "/fargate/service/${var.DEPLOY_TAG}/falafel"
  retention_in_days = "14"
}

# Configure ALB to route /falafel to server.
resource "aws_alb_target_group" "falafel" {
  name                 = "${var.DEPLOY_TAG}-falafel"
  port                 = "80"
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = data.terraform_remote_state.setup_iac.outputs.vpc_id
  deregistration_delay = 5

  health_check {
    path                = "/${var.DEPLOY_TAG}/falafel"
    matcher             = "200"
    interval            = 10
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
  }

  tags = {
    name = "${var.DEPLOY_TAG}-falafel"
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = data.terraform_remote_state.aztec2_iac.outputs.alb_listener_arn
  priority     = 400

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.falafel.arn
  }

  condition {
    path_pattern {
      values = ["/${var.DEPLOY_TAG}/falafel*"]
    }
  }
}
