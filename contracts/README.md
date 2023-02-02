# Aztec-Connect Contracts

## Getting setup

As per usual, running `./bootstrap.sh` should get you up to speed. However some information below on the use of submodules is covered to help you reason about it does.

This project uses foundry as it's testing framework, before getting started / if you have any issues it is worth exploring the [book](https://book.getfoundry.sh/). It is generally a fantastic up to date resource.

## Setting up submodules

Foundry has some wrapper functions around submodules that generally make them easier to work with. If it is your first time setting up this repo running `forge install --no-commit` should have you ready to roll.

`forge update --no-commit` is the command to use if submodules has changed and you already have some installed. If submodules are causing a lot of issues and lots of errors are occurring while attempting to install. Deleting the /lib folder and running `forge install --no-commit` will generally resolve the issues.

# Tests

`forge test` will run the test suite. See the forge book linked above about how to target specific tests.

## Running the docker for tests locally:

```bash
# In root run
docker build -f ./contracts/DockerFile --no-cache .
```

# Generating new verification keys

It is possible to generate new verification keys by running the `generate_vks.sh` script that is put in `verification-keys`. This generates the keys and their matching solidity contracts. Also to be used for generating the large 28x32 key.

# Verifier test

The verifier test is available in `yarn-project/contracts-verifier-test`.

# Deployments

## e2e tests

The familiar tmux-scripts and docker-compose setups will automatically deploy a new set of contracts to a anvil instance for you.  
If you would just like to run the deployment script for testing purposes, `deploy_local` will set reasonable defaults and then run the testing script.

## Devnet / Stage / Testnet Deployments

The CD pipeline will use the script in `deploy/deploy_contracts.sh` to reason whether it should perform new deployments or not.

**Environment Variables**
When deploying to dev or testnet from a local machine, there are some required environment variables

Required:

- ETHEREUM_HOST - The rpc url you are targeting
- PRIVATE_KEY - The private key you are deploying from

Optional:

- DEPLOYER_ADDRESS - The address of the key you are deploying from [default: the address matching the PRIVATE_KEY]
- ROLLUP_PROVIDER_ADDRESS - The address to be added as a sequencer [default: DEPLOYER_ADDRESS]
- FAUCET_CONTROLLER - The address that will be given superOperator privileges when the faucet is deployed [default: DEPLOYER_ADDRESS]
- SAFE_ADDRESS - The address to own the deployed system [default: DEPLOYER_ADDRESS]
- VK - The verification key type (VerificationKey1x1 | VerificationKey28x32 | MockVerifier) [default: MockVerifier]
- UPGRADE - Flag to upgrade rollup to use the newest implementation [default: true]

### How are deployments triggered?

Inside the `deploy` folder there are files named for each of the environments (`dev`, `testnet`. `stage`). In the deployment script it will check whether there is a diff in the file of the deployment environment. E.g. if you want to trigger a redeploy in dev, then if your version tag has a change in the dev file, it will redeploy the contracts.  
Please exercise caution in your commits that these files have not changed by accident.

### How do downstream services consume the contract addresses?

#### e2e

In e2e tests the contracts service will serve the deployed addresses using `socat` - see `serve.sh`. It will look for the output of the deployment script `/serve/deployment_addresses.json` and serve it on a defined port (usually 8547). Before each of the other services (`kebab`, `falafel`) boot they run an `export_addresses` script that queries the contract addresses on this port.

### Deployments

At the end of the deployments script there is a loop that will export all of the critical addresses into terraform variables. The accompanying files in the `terraform` folder will output these addresses such that they are available to the other services as environment vars at deploy time.
