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

# Create a fleet. We want 1 permanent on-demand instance to ensure liveness.
# We will fill the remaining desired instances from spot capacity.
data "template_file" "user_data" {
  template = <<EOF
#!/bin/bash
echo ECS_CLUSTER=${data.terraform_remote_state.setup_iac.outputs.ecs_cluster_name} >> /etc/ecs/ecs.config
echo 'ECS_INSTANCE_ATTRIBUTES={"group": "${var.DEPLOY_TAG}-halloumi-inner"}' >> /etc/ecs/ecs.config
EOF
}

resource "aws_launch_template" "halloumi_inner" {
  name                   = "halloumi-inner"
  image_id               = "ami-0cd4858f2b923aa6b"
  instance_type          = "r5.8xlarge"
  vpc_security_group_ids = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]

  iam_instance_profile {
    name = data.terraform_remote_state.setup_iac.outputs.ecs_instance_profile_name
  }

  key_name = data.terraform_remote_state.setup_iac.outputs.ecs_instance_key_pair_name

  user_data = base64encode(data.template_file.user_data.rendered)

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name       = "${var.DEPLOY_TAG}-halloumi-inner"
      prometheus = ""
    }
  }
}

resource "aws_ec2_fleet" "halloumi_inner" {
  launch_template_config {
    launch_template_specification {
      launch_template_id = aws_launch_template.halloumi_inner.id
      version            = aws_launch_template.halloumi_inner.latest_version
    }

    override {
      subnet_id         = data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id
      availability_zone = "eu-west-2a"
      max_price         = "0.6"
    }

    override {
      subnet_id         = data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
      availability_zone = "eu-west-2b"
      max_price         = "0.6"
    }
  }

  target_capacity_specification {
    default_target_capacity_type = "spot"
    total_target_capacity        = 4
    spot_target_capacity         = 3
    on_demand_target_capacity    = 1
  }

  terminate_instances                 = true
  terminate_instances_with_expiration = true
}

# Create EC2 instances for outer halloumi.
resource "aws_instance" "halloumi_outer" {
  ami                    = "ami-0cd4858f2b923aa6b"
  instance_type          = "r5.8xlarge"
  subnet_id              = data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id
  vpc_security_group_ids = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
  iam_instance_profile   = data.terraform_remote_state.setup_iac.outputs.ecs_instance_profile_name
  key_name               = data.terraform_remote_state.setup_iac.outputs.ecs_instance_key_pair_name
  availability_zone      = "eu-west-2a"

  user_data = <<USER_DATA
#!/bin/bash
echo ECS_CLUSTER=${data.terraform_remote_state.setup_iac.outputs.ecs_cluster_name} >> /etc/ecs/ecs.config
echo 'ECS_INSTANCE_ATTRIBUTES={"group": "${var.DEPLOY_TAG}-halloumi-outer"}' >> /etc/ecs/ecs.config
USER_DATA

  tags = {
    Name       = "${var.DEPLOY_TAG}-halloumi-outer"
    prometheus = ""
  }
}

# Define task definition and service for "inner proof" halloumi.
resource "aws_ecs_task_definition" "halloumi_inner" {
  family                   = "${var.DEPLOY_TAG}-halloumi-inner"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-halloumi-inner",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/halloumi:${var.IMAGE_TAG != "" ? var.IMAGE_TAG : var.DEPLOY_TAG}",
    "essential": true,
    "memoryReservation": 253952,
    "portMappings": [
      {
        "containerPort": 80
      }
    ],
    "environment": [
      {
        "name": "DEPLOY_TAG",
        "value": "${var.DEPLOY_TAG}"
      },
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
      },
      {
        "name": "JOB_SERVER_URL",
        "value": "http://${var.DEPLOY_TAG}-falafel.local:8082"
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
        "name": "LAZY_INIT",
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
        "name": "DEPLOY_TAG",
        "value": "${var.DEPLOY_TAG}"
      },
      {
        "name": "SERVICE",
        "value": "${var.DEPLOY_TAG}-halloumi-inner"
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

resource "aws_ecs_service" "halloumi_inner" {
  name                               = "${var.DEPLOY_TAG}-halloumi-inner"
  cluster                            = data.terraform_remote_state.setup_iac.outputs.ecs_cluster_id
  launch_type                        = "EC2"
  desired_count                      = 4
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0

  network_configuration {
    subnets = [
      data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id,
      data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
    ]
    security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.halloumi.arn
    container_name = "${var.DEPLOY_TAG}-halloumi-inner"
    container_port = 80
  }

  placement_constraints {
    type       = "memberOf"
    expression = "attribute:group == ${var.DEPLOY_TAG}-halloumi-inner"
  }

  task_definition = aws_ecs_task_definition.halloumi_inner.family
}

# Define task definition and service for "outer proofs" halloumi.
resource "aws_ecs_task_definition" "halloumi_outer" {
  family                   = "${var.DEPLOY_TAG}-halloumi-outer"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  execution_role_arn       = data.terraform_remote_state.setup_iac.outputs.ecs_task_execution_role_arn

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-halloumi-outer",
    "image": "278380418400.dkr.ecr.eu-west-2.amazonaws.com/halloumi:${var.IMAGE_TAG != "" ? var.IMAGE_TAG : var.DEPLOY_TAG}",
    "essential": true,
    "memoryReservation": 253952,
    "portMappings": [
      {
        "containerPort": 80
      }
    ],
    "environment": [
      {
        "name": "DEPLOY_TAG",
        "value": "${var.DEPLOY_TAG}"
      },
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
      },
      {
        "name": "JOB_SERVER_URL",
        "value": "http://${var.DEPLOY_TAG}-falafel.local:8083"
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
        "name": "LAZY_INIT",
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
        "name": "DEPLOY_TAG",
        "value": "${var.DEPLOY_TAG}"
      },
      {
        "name": "SERVICE",
        "value": "${var.DEPLOY_TAG}-halloumi-outer"
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

resource "aws_ecs_service" "halloumi_outer" {
  name                               = "${var.DEPLOY_TAG}-halloumi-outer"
  cluster                            = data.terraform_remote_state.setup_iac.outputs.ecs_cluster_id
  launch_type                        = "EC2"
  desired_count                      = 1
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0

  network_configuration {
    subnets = [
      data.terraform_remote_state.setup_iac.outputs.subnet_az1_private_id,
      data.terraform_remote_state.setup_iac.outputs.subnet_az2_private_id
    ]
    security_groups = [data.terraform_remote_state.setup_iac.outputs.security_group_private_id]
  }

  service_registries {
    registry_arn   = aws_service_discovery_service.halloumi.arn
    container_name = "${var.DEPLOY_TAG}-halloumi-outer"
    container_port = 80
  }

  placement_constraints {
    type       = "memberOf"
    expression = "attribute:group == ${var.DEPLOY_TAG}-halloumi-outer"
  }

  task_definition = aws_ecs_task_definition.halloumi_outer.family
}

# Logs
resource "aws_cloudwatch_log_group" "halloumi_logs" {
  name              = "/fargate/service/${var.DEPLOY_TAG}/halloumi"
  retention_in_days = "14"
}
