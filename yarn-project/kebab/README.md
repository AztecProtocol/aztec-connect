# Kebab

Kebab is an Ethereum node proxy server. It is meant to optimise common requests that Falafel & other Aztec Connect services make.
Specifically, it's responsible for:

- Storing Aztec Connect's Ethereum event logs in a DB so they can be quickly queried, without relying on an Ethereum node's `eth_getLogs`
- Caching common request result like `eth_chainId` to optimise response time.
- If necessary, filtering out requests that do **not** start with `eth_`. This is to prevent users from using debugging methods in testing environments, e.g. `evm_increaseTime`.
- Restricting access to Aztec's Ethereum node for users that have access to Kebab's API keys.

## Configuration

Most responsibilities listed above can be turned on/off when Kebab server starts. These cannot be updated during runtime. Specified config variables are stored locally in `./data/config`. If a config file is present, variables that are not specified at startup will be rehydrated from there.

Config variables spec:

```ts
interface StartupConfig {
  // The port number on which to start the http service. Env: PORT
  port: number;
  // The URL of an Ethereum node that Kebab uses to serve requests & build the Aztec Connect logs DB. Env: ETHEREUM_HOST
  ethereumHost: string;
  // The prefix used as part of Kebab's API routes e.g. https://aztec-connect-dev-eth-host.aztec.network:8545/<api prefix>/status. Env: API_PREFIX
  apiPrefix: string;
  // A flag specifying whether additional logging be added to DB calls. Env: TYPEORM_LOGGING
  typeOrmLogging: boolean;
  // A flag specifying whether Kebab should allow methods that DON'T start with `eth_` to be executed. Env: ALLOW_PRIVILEGED_METHODS
  allowPrivilegedMethods: boolean;
  // A list of specific methods that DON'T start with `eth_` that Kebab should allow to be executed. Env: ADDITIONAL_PERMITTED_METHODS
  additionalPermittedMethods: string[];
  // A list of keys that can restrict access to Kebab if specified. Adding an API key updates Kebab's endpoint that serves ETH requests.
  // e.g. POST https://aztec-connect-dev-eth-host.aztec.network:8545/<prefix>/<api key>
  apiKeys: string[];
  // A flag specifying whether Kebab should create an Aztec Connect event DB and serve related `eth_getLogs` calls from there. Env: INDEXING
  indexing: boolean;
  // The Ethereum address of the Aztec Connect contract. Env: ROLLUP_CONTRACT_ADDRESS
  rollupContractAddress: EthAddress;
}
```

## Indexing

When kebab is in `indexing` mode, it has to store Aztec Connect relevant events to its DB. this means that the service won't be ready to use until **all** pre-existing events are retrieved and stored in the DB.
This is done by querying the specified `ETHEREUM_HOST` for logs under hardcoded Aztec Connect topic hashes. Starting from the first known Aztec Connect block, Kebab requests sequential batches of these events until we reach the latest Eth block number.

## Proxying

Once the server starts, it serves as a common Ethereum JSON-RPC. All commonly supported API methods should return a result. JSON-RPC API documentation can be found [here](https://ethereum.org/en/developers/docs/apis/json-rpc/).
Depending on the request's `method`, Kebab will do one of the following:

- `eth_getLogs`: If the main `topic` in the request's arguments matches one of Aztec Connect's event topics **and** Kebab is set to `indexing` mode, It looks in its DB and returns the result.
- Methods included in `REQUEST_TYPES_TO_CACHE`: Kebab will hash the request arguments to generate a key and check its cache for anything stored under that key. If a result is found, it's returned, otherwise the equest is forwarded to `ETHEREUM_HOST` and the response is cached and returned.
- Any other method will be directly sent to `ETHEREUM_HOST`.

## Infrastructure Resource Requirements

The following are snippets of Terraform that demonstrate some of the resources deployed to the current production environment and the configuration applied. The environment consists of a dockerised Kebab deployment with an attached scalable filesystem that is used for sqlite DB storage.

```terraform
# Configure an EFS filesystem.
resource "aws_efs_file_system" "kebab_data_store" {
  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }
}


# Define task definition and service.
resource "aws_ecs_task_definition" "kebab" {
  family                   = "${var.DEPLOY_TAG}-kebab"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "2048"
  memory                   = "16384"

  volume {
    name = "efs-data-store"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.kebab_data_store.id
    }
  }

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-kebab",
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
        "value": "<REDACTED>"
      },
      {
        "name": "ROLLUP_CONTRACT_ADDRESS",
        "value": "0xFF1F2B4ADb9dF6FC8eAFecDcbF96A2B351680455"
      },
      {
        "name": "ADDITIONAL_PERMITTED_METHODS",
        "value": "net_version"
      },
      {
        "name": "INDEXING",
        "value": "true"
      }
    ],
    "mountPoints": [
      {
        "containerPath": "/usr/src/yarn-project/kebab/data",
        "sourceVolume": "efs-data-store"
      }
    ],
  }
]
DEFINITIONS
}


resource "aws_ecs_service" "kebab" {
  name                               = "${var.DEPLOY_TAG}-kebab"
  launch_type                        = "FARGATE"
  desired_count                      = 1
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0
  platform_version                   = "1.4.0"

  task_definition = aws_ecs_task_definition.kebab.family
}
```
