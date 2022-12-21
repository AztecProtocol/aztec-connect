#!/bin/bash

# Set sensible defaults for local testing then perform e2e deployment
export ETHEREUM_HOST=http://localhost:8545
export DEPLOY_CONTRACTS=true
export SAFE_ADDRESS=0x7095057A08879e09DC1c0a85520e3160A0F67C96
export PROVERLESS=true
export UPGRADE=true
# Ganache test account #0
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

bash scripts/deploy_e2e.sh