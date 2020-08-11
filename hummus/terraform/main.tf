terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/hummus"
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

resource "aws_service_discovery_service" "hummus" {
  name = "hummus"

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

resource "aws_ecs_task_definition" "hummus" {
  family                   = "hummus"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  container_definitions = <<DEFINITIONS
[
  {
    "name": "hummus",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/hummus:latest",
    "essential": true,
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
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/hummus",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }
]
DEFINITIONS
}

data "aws_ecs_task_definition" "hummus" {
  task_definition = aws_ecs_task_definition.hummus.family
}

resource "aws_ecs_service" "hummus" {
  name          = "hummus"
  cluster       = data.terraform_remote_state.setup_iac.outputs.ecs_cluster_id
  launch_type   = "FARGATE"
  desired_count = "1"

  network_configuration {
    subnets = [
      data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id,
      data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
    ]
    security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.hummus.arn
    container_name   = "hummus"
    container_port   = 80
  }

  service_registries {
    registry_arn = aws_service_discovery_service.hummus.arn
  }

  # Track the latest ACTIVE revision
  task_definition = "${aws_ecs_task_definition.hummus.family}:${max("${aws_ecs_task_definition.hummus.revision}", "${data.aws_ecs_task_definition.hummus.revision}")}"

  lifecycle {
    ignore_changes = [task_definition]
  }
}

# Logs
resource "aws_cloudwatch_log_group" "hummus" {
  name              = "/fargate/service/hummus"
  retention_in_days = "14"
}

# Configure ALB route.
resource "aws_alb_target_group" "hummus" {
  name        = "hummus"
  port        = "80"
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = data.terraform_remote_state.setup_iac.outputs.vpc_id
  tags = {
    name = "hummus"
  }
}

resource "aws_lb_listener_rule" "hummus" {
  listener_arn = data.terraform_remote_state.aztec2_iac.outputs.alb_listener_arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.hummus.arn
  }

  condition {
    path_pattern {
      values = ["*"]
    }
  }
}
