# Aztec-Connect Contracts

## Overview

Aztec is a privacy-first recursive zero-knowledge rollup (zk-zk-rollup) built on Ethereum and today it is the only zkRollup built from the ground up to be privacy-preserving. Its unique architecture ensures that transactions are private, while also retaining auditability and compliance. Our long-term vision is building a decentralized, high-throughput, privacy-preserving network that enables Web3 to cross the chasm and achieve mainstream adoption.

For more information about Aztec, please visit https://aztec.network/ or https://twitter.com/aztecnetwork. Documentation for Aztec Connect Bridges is available at https://github.com/AztecProtocol/aztec-connect-bridges.

If you are interested in the Rollup Contract itself, a reference implementation (too big for mainnet) is put in the `core/reference` folder, it uses less yul so is a little easier to reason about.

## Developers

If you would like to build on top of Aztec, please see our [documentation](https://aztec.network/developers/).  
If you would like to contribute to the protocol, please see the [aztec2 book](https://github.com/AztecProtocol/aztec-connect/tree/master/specs/aztec-connect) for our specifications.

### Getting started

```
./bootstrap.sh
```

As per usual, running `./bootstrap.sh` should get you up to speed. It will install any submodules / frameworks required.
This project uses foundry as it's testing framework, before getting started / if you have any issues consult the [book](https://book.getfoundry.sh/).

### Submodules

Forge modules:

- [forge-std](https://github.com/foundry-rs/forge-std) (Testing)
- [uniswap v2 core](https://github.com/uniswap/v2-core) (Fee Distributor dependency)
- [uniswap v2 periphery](https://github.com/uniswap/v2-periphery) (Fee Distributor dependency)
- [openzeppelin contracts](https://github.com/openzeppelin/openzeppelin-contracts)
- [openzeppelin contracts upgradable](https://github.com/openzeppelin/openzeppelin-contracts-upgradable)
- [rollup encoder](https://github.com/AztecProtocol/rollup-encoder) (Test harness to encode rollup calldata)
- [aztec connect bridges](https://github.com/AztecProtocol/aztec-connect-bridges) (Bridges repository)

Use `forge update --no-commit` if submodules have changed and you already have some installed. If submodules are causing issues and errors are occurring while installing. Deleting the `/lib` folder then running `forge install --no-commit` will generally resolve the issues.

### Directory Structure

```
src
├── core
│   ├── Decoder.sol
│   ├── DefiBridgeProxy.sol
│   ├── processors
│   │   ├── RollupProcessor.sol
│   │   └── RollupProcessorV2.sol
│   ├── reference
│   │   └── RollupProcessorV2Reference.sol
│   └── verifier
│       ├── BaseStandardVerifier.sol
│       ├── instances
│       │   └── ... Contract Verifiers
│       └── keys
│           └── ... Contract Verification Keys
├── periphery
│   ├── AztecFaucet.sol
│   ├── AztecFeeDistributor.sol
│   ├── PermitHelper.sol
│   └── ProxyDeployer.sol
├── script
│   └── ... Deployment scripts
└── test
    └── ... Test suite
```
## Tests

`forge test` will run the test suite. See the forge book linked above about how to target specific tests. To use the reference implementation set `export REFERENCE=true`. 

### Running tests in a Docker container:

```bash
# In root run
docker build --no-cache .
```

## Generating new verification keys (for aztec developers)

It is possible to generate new verification keys by running the `generate_vks.sh` script that is put in `verification-keys`. This generates the keys and their matching solidity contracts. For example the 28x32 key (used in our production rollup) verifies the circuit which validates 28 recursive proofs of 32 smaller inner proofs.

## Deployments

### Devnet / Stage / Testnet Deployments

The CI/CD pipeline will use the script in `deploy/deploy_contracts.sh` to orchestrate deployments.

### Local Deployments

To quickly bootstrap an anvil fork with our entire suite of mainnet contracts deployed run `scripts/start_e2e_fork.sh`.

**Environment Variables**
When deploying to dev or testnet from a local machine, there are some required environment variables.

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

Redeploying the testnet contracts can be done in one click with the `redeploy-mainnet-fork` circle ci workflow.
To force deployments through ci there are override files for each environment inside the `deploy` folder (`dev`, `testnet`. `stage`). The deployment script it will check whether there is a diff in the target environment's file. E.g. if you want to force a redeploy in dev, changing the dev file will trigger it.  
Please exercise caution in your commits that these files have not changed by accident.

### How do downstream services consume the contract addresses?

#### e2e

For e2e tests the contracts service will serve deployed addresses using `socat` - see `serve.sh`. It will serve the deployment script output (`/serve/deployment_addresses.json`) on the defined port (8547 by default). When downstream services (`kebab`, `falafel`) boot they run an `export_addresses` script that consumes the contract addresses.

#### Deployments

At the end of the deployments script, all critical addresses will be saved into terraform variables. They are consumed by downstream services as env vars at deploy time.
