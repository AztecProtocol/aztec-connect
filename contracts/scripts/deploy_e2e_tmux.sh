#!/bin/bash
# Performs a local contract deployment using deploy_local this:
# - Deploys a new set of contracts with deploy_e2e.sh
# - This will run the solidity script found in src/script/deployments/E2ESetup.s.sol
# This deployment script will write an contract_addresses.json file to a /serve/ directory.
# `serve.sh` will serve this contracts file using socat to the port specified by `SERVE_PORT`  
# Downstream services in e2e tests can then get the contract addresses by querying this server.

export SERVE_PORT=8547

# Remove the existing contract_addresses.json to prevent serving stale addresses
rm serve/contract_addresses.json

bash scripts/deploy_local.sh
bash scripts/serve.sh
