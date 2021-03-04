terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/halloumi"
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

resource "aws_service_discovery_service" "halloumi" {
  name = "halloumi"

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
    command = "${path.module}/servicediscovery-drain.sh ${self.id}"
  }
}

# Create EC2 instances in each AZ.
resource "aws_instance" "container_instance_az1" {
  ami                    = "ami-0cd4858f2b923aa6b"
  instance_type          = "r5.8xlarge"
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
echo 'ECS_INSTANCE_ATTRIBUTES={"group": "halloumi"}' >> /etc/ecs/ecs.config
USER_DATA

  tags = {
    Name       = "halloumi-container-instance-az1"
    prometheus = ""
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
# echo 'ECS_INSTANCE_ATTRIBUTES={"group": "halloumi"}' >> /etc/ecs/ecs.config
# USER_DATA

#   tags = {
#     Name = "halloumi-container-instance-az2"
#   }
# }

# Define task definition and service.
resource "aws_ecs_task_definition" "halloumi" {
  family                   = "halloumi"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  container_definitions = <<DEFINITIONS
[
  {
    "name": "halloumi",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/halloumi:latest",
    "essential": true,
    "memoryReservation": 253952,
    "cpu": 32,
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
        "name": "MAX_CIRCUIT_SIZE",
        "value": "33554432"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/halloumi",
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
        "value": "halloumi"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/fargate/service/halloumi",
        "awslogs-region": "eu-west-2",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }
]
DEFINITIONS
}

data "aws_ecs_task_definition" "halloumi" {
  task_definition = aws_ecs_task_definition.halloumi.family
}

resource "aws_ecs_service" "halloumi" {
  name                               = "halloumi"
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

  # load_balancer {
  #   target_group_arn = aws_alb_target_group.halloumi.arn
  #   container_name   = "halloumi"
  #   container_port   = 80
  # }

  service_registries {
    registry_arn   = aws_service_discovery_service.halloumi.arn
    container_name = "halloumi"
    container_port = 80
  }

  placement_constraints {
    type       = "memberOf"
    expression = "attribute:group == halloumi"
  }

  task_definition = "${aws_ecs_task_definition.halloumi.family}:${max(aws_ecs_task_definition.halloumi.revision, data.aws_ecs_task_definition.halloumi.revision)}"
}

# Logs
resource "aws_cloudwatch_log_group" "halloumi_logs" {
  name              = "/fargate/service/halloumi"
  retention_in_days = "14"
}
