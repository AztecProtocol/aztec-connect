# halloumi

Halloumi functions as a standalone proof generation service.

## Functionality

This service is composed of 2 primary parts. A Typescript service used to interact with the other services within the rollup provider platform and a C++ proof generation application. The two parts communicate through stdio.

An HTTP service is instantiated on the provided `PORT` number and it is possible to make requests to this service for things like verification keys and new proofs. Typically however, this is not how the system is configured. When running a Halloumi instance, usually communication happens in reverse with Halloumi making requests to Falafel for new work to be done before posting the results of that work back to Falafel. This is because proofs take some time to build and this provides a more robust, decoupled solution.

## Usage

There are 10 environmental variables used by the service:

1. `MAX_CIRCUIT_SIZE` The maximum number of gates available in the current circuit configuration. This must be a power of 2 and must correspond to the current circuit being used elsewhere in the platform. Current value: 33554432 (2^25)
2. `NUM_INNER_ROLLUP_TXS` Maximum number of transactions within an inner rollup. Current value: 28.
3. `NUM_OUTER_ROLLUP_PROOFS` Maximum number of inner rollups within an outer rollup proof. Current value: 32.
4. `PROVERLESS` A flag indicating whether a mock prover will be used. This should be used for test enviroments only
5. `LAZY_INIT` A flag indicating whether proving keys should be created lazily to improve startup times. Current value: true
6. `PERSIST` True if rollup circuit data (proving and verification keys) are to be persisted to disk. Current value: false
7. `DATA_DIR` A path where relevant data (e.g. common reference string (CRS)) should be saved (defaults to `./data`)
8. `JOB_SERVER_URL` This is the URL to which Halloumi makes requests for new work items and completed jobs (proofs, verification keys etc.) (defaults to `http://localhost:8082`)
9. `API_PREFIX` The prefix to add to all API routes of the HTTP server (e.g. '/aztec-connect-prod/halloumi', defaults to an empty string).
10. `PORT` The port the HTTP service will listen on (defaults to `8083`).

To start the service do the following:

1. Make sure that before doing so the whole monorepo was built first by running `./bootstrap.sh` in repository root.
2. Set the environmental variables (if the defaults are not desired).
3. Run `yarn` in block-server root.
4. Run `yarn build` in block-server root.
5. Run `yarn start` in block-server root.

## Resources

Building proofs is a resource intensive process and requires machines with high CPU and memory capabilities. Currently, in the production environment there are 2 configurations of Halloumi services being run:

1. A single 'halloumi-outer' service designed to operate solely on outer rollup proof and verification proofs. Is is configured to contact Falalel at Falafel's local route and port 8083.
2. A horizontally scalable set of 'halloumi-inner' services designed to operate on inner transaction rollups and claim proofs. These services are configured to contact Falafel at Falafel's local route and port 8082.

Seperating the Halloumi configurations like this means we can reduce the memory requirement of the Halloumi services as no single instance will need to generate all proving keys.

The most significant contributing factor towards rollup latency is the size of the 'halloumi-inner' fleet. Maintaining a fleet of 32 instances would result in every rollup being produced as quickly as possible but at the cost of maintaining those machines.

The following is a snippet of the Terraform used in the current halloumi configurations showing resource allocations and current environment settings.

```
# Create EC2 instances for outer halloumi.
resource "aws_instance" "halloumi_outer" {
  ami                    = "ami-0cd4858f2b923aa6b"
  instance_type          = "r5.8xlarge"
}

# Define task definition and service for "outer proofs" halloumi.
resource "aws_ecs_task_definition" "halloumi_outer" {
  family                   = "${var.DEPLOY_TAG}-halloumi-outer"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-halloumi-outer",
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
        "name": "API_PREFIX",
        "value": "/${var.DEPLOY_TAG}/halloumi"
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
    ]
]
DEFINITIONS
}

resource "aws_ecs_service" "halloumi_outer" {
  name                               = "${var.DEPLOY_TAG}-halloumi-outer"
  launch_type                        = "EC2"
  desired_count                      = 1
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0
}

# Launch configuration for fleet of 'halloumi-inner's
resource "aws_launch_template" "halloumi_inner" {
  name                   = "halloumi-inner"
  image_id               = "ami-0cd4858f2b923aa6b"
  instance_type          = "r5.8xlarge"
}

resource "aws_ec2_fleet" "halloumi_inner" {
  target_capacity_specification {
    default_target_capacity_type = "spot"
    total_target_capacity        = 8
    spot_target_capacity         = 7
    on_demand_target_capacity    = 1
  }

  terminate_instances                 = true
  terminate_instances_with_expiration = true
}

# Define task definition and service for "inner proof" halloumi.
resource "aws_ecs_task_definition" "halloumi_inner" {
  family                   = "${var.DEPLOY_TAG}-halloumi-inner"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-halloumi-inner",
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
        "name": "API_PREFIX",
        "value": "/${var.DEPLOY_TAG}/halloumi"
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
    ]
  }
]
DEFINITIONS
}

resource "aws_ecs_service" "halloumi_inner" {
  name                               = "${var.DEPLOY_TAG}-halloumi-inner"
  launch_type                        = "EC2"
  desired_count                      = 8
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0
}
```
