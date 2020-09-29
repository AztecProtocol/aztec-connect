terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/falafel"
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
  name = "falafel"

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

# Create EC2 instances in each AZ.
resource "aws_instance" "container_instance_az1" {
  ami                    = "ami-08ebd554ebc53fa9f"
  instance_type          = "m5.4xlarge"
  subnet_id              = data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id
  vpc_security_group_ids = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
  iam_instance_profile   = data.terraform_remote_state.setup_iac.outputs.ecs_instance_profile_name
  key_name               = data.terraform_remote_state.setup_iac.outputs.ecs_instance_key_pair_name
  availability_zone      = "eu-west-2a"

  user_data = <<USER_DATA
#!/bin/bash
echo ECS_CLUSTER=${data.terraform_remote_state.setup_iac.outputs.ecs_cluster_name} >> /etc/ecs/ecs.config
echo 'ECS_INSTANCE_ATTRIBUTES={"group": "falafel"}' >> /etc/ecs/ecs.config
USER_DATA

  tags = {
    Name = "falafel-container-instance-az1"
  }
}

# resource "aws_instance" "container_instance_az2" {
#   ami                    = "ami-08ebd554ebc53fa9f"
#   instance_type          = "m5.2xlarge"
#   subnet_id              = data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
#   vpc_security_group_ids = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
#   iam_instance_profile   = data.terraform_remote_state.setup_iac.outputs.ecs_instance_profile_name
#   key_name               = data.terraform_remote_state.setup_iac.outputs.ecs_instance_key_pair_name
#   availability_zone      = "eu-west-2b"

#   user_data = <<USER_DATA
# #!/bin/bash
# echo ECS_CLUSTER=${data.terraform_remote_state.setup_iac.outputs.ecs_cluster_name} >> /etc/ecs/ecs.config
# echo 'ECS_INSTANCE_ATTRIBUTES={"group": "falafel"}' >> /etc/ecs/ecs.config
# USER_DATA

#   tags = {
#     Name = "falafel-container-instance-az2"
#   }
# }

# Configure an EFS filesystem for holding transcripts and state data, mountable in each AZ.
resource "aws_efs_file_system" "falafel_data_store" {
  creation_token = "falafel-data-store"

  tags = {
    Name = "falafel-data-store"
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
  family                   = "falafel"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  volume {
    name = "efs-data-store"
    docker_volume_configuration {
      scope         = "shared"
      autoprovision = true
      driver        = "local"
      driver_opts = {
        type   = "nfs"
        device = "${aws_efs_file_system.falafel_data_store.dns_name}:/"
        o      = "addr=${aws_efs_file_system.falafel_data_store.dns_name},nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2"
      }
    }
  }

  container_definitions = <<DEFINITIONS
[
  {
    "name": "falafel",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel:latest",
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
        "name": "PRIVATE_KEY",
        "value": "${var.PRIVATE_KEY}"
      },
      {
        "name": "ROLLUP_CONTRACT_ADDRESS",
        "value": "0xdA7A8093927deC164abFf658B65a16735F0Ed1c9"
      },
      {
        "name": "API_PREFIX",
        "value": "/falafel"
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
        "awslogs-group": "/fargate/service/falafel",
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
  name                               = "falafel"
  cluster                            = data.terraform_remote_state.setup_iac.outputs.ecs_cluster_id
  launch_type                        = "EC2"
  desired_count                      = "1"
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0

  network_configuration {
    subnets = [
      data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id,
      data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
    ]
    security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.falafel.arn
    container_name   = "falafel"
    container_port   = 80
  }

  service_registries {
    registry_arn = aws_service_discovery_service.falafel.arn
  }

  placement_constraints {
    type       = "memberOf"
    expression = "attribute:group == falafel"
  }

  task_definition = "${aws_ecs_task_definition.falafel.family}:${max(aws_ecs_task_definition.falafel.revision, data.aws_ecs_task_definition.falafel.revision)}"
}

# Logs
resource "aws_cloudwatch_log_group" "falafel_logs" {
  name              = "/fargate/service/falafel"
  retention_in_days = "14"
}

# Configure ALB to route /falafel to server.
resource "aws_alb_target_group" "falafel" {
  name                 = "falafel"
  port                 = "80"
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = data.terraform_remote_state.setup_iac.outputs.vpc_id
  deregistration_delay = 5

  health_check {
    path                = "/falafel"
    matcher             = "200"
    interval            = 60
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 3
  }

  tags = {
    name = "falafel"
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = data.terraform_remote_state.aztec2_iac.outputs.alb_listener_arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.falafel.arn
  }

  condition {
    path_pattern {
      values = ["/falafel/*"]
    }
  }
}
