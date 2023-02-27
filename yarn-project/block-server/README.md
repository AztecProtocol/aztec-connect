# Block Server

Horizontally scaleable block server acting like a caching layer for Falafel's get-blocks endpoint.

## Functionality

The service pulls blocks from Falafel and saves them in a fast to access cache (essentially an array of buffers).

## Usage

There are 4 environmental variables used by the service:

1. `PORT` The port the service will listen on (defaults to `8084`).
2. `FALAFEL_URL` The URL of the falafel service (defaults to `http://localhost:8081`).
3. `API_PREFIX` The prefix to add to all API routes (e.g. '/aztec-connect-prod/falafel', defaults to an empty string).
4. `INIT_FULL_SYNC` A flag indicating whether to perform a full sync on initialization or not.
   If this flag is not set, only the latest block will be fetched on initialization and the rest will be obtained when requested for the first time (defaults to `false`).

To start the service do the following:

1. Make sure that before doing so the whole monorepo was built first by running `./bootstrap.sh` in repository root.
2. Set the environmental variables (if the defaults are not desired).
3. Run `yarn` in block-server root.
4. Run `yarn build` in block-server root.
5. Run `yarn start` in block-server root.

## Resource Requirements

The following contains snippets of Terraform demonstrating the environment configuration and the resources allocated to the current production block-server deployment.

```
# Define task definition and service.
resource "aws_ecs_task_definition" "block-server" {
  family                   = "${var.DEPLOY_TAG}-block-server"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "2048"
  memory                   = "4096"

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-block-server",
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
        "name": "FALAFEL_URL",
        "value": "http://${var.DEPLOY_TAG}-falafel.local/${var.DEPLOY_TAG}/falafel"
      },
      {
        "name": "API_PREFIX",
        "value": "/${var.DEPLOY_TAG}/falafel"
      },
      {
        "name": "INIT_FULL_SYNC",
        "value": "false"
      }
    ]
  }
]
DEFINITIONS
}

resource "aws_ecs_service" "block-server" {
  name                               = "${var.DEPLOY_TAG}-block-server"
  launch_type                        = "FARGATE"
  desired_count                      = 4
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0
  platform_version                   = "1.4.0"

  task_definition = aws_ecs_task_definition.block-server.family
}

```
