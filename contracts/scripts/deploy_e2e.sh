#!/bin/bash

# Sets up defaults then runs the E2E Setup script to perform contract deployments
# 
# Expected enviornment variables
# - ROLLUP_PROVIDER_ADDRESS - The address capable of submitting rollups, will default to deployer
# - FAUCET_CONTROLLER - Faucet superuser, will default to deployer
# - SAFE_ADDRESS - Permissioned address - usually multisig, will default to deployer
# - VERIFIER_TYPE - The type of verifier that is used, test environments will use the MockDeployer
# - ETHEREUM_HOST - Target chain rpc
# - PRIVATE_KEY - Deployer key

if [ "$DEPLOY_CONTRACTS" == "true" ]; then
  # create output directory
  mkdir -p serve/
  echo "Created output directory"

  # Set Rollup provider address to the deployer if none is provided
  DEPLOYER_ADDRESS=$(cast w a --private-key "$PRIVATE_KEY")
  ROLLUP_PROVIDER_ADDRESS=${ROLLUP_PROVIDER_ADDRESS:-$DEPLOYER_ADDRESS}
  FAUCET_CONTROLLER=${FAUCET_CONTROLLER:-$DEPLOYER_ADDRESS}
  SAFE_ADDRESS=${SAFE_ADDRESS:-$DEPLOYER_ADDRESS}
  
  # If Proverless if false then VK will be set
  VERIFIER_TYPE=${VK:-'MockVerifier'}

  echo "Deploying contracts"    
  echo "Deploying from: $DEPLOYER_ADDRESS"

  # NOTE: hard coded at 50 gwei + using legacy flag to support ganache
  forge script E2ESetup --ffi --private-key $PRIVATE_KEY --legacy --with-gas-price 100000000000 --slow --broadcast --rpc-url $ETHEREUM_HOST --sig "deploy(address,address,address,address,string,bool)" \
    $DEPLOYER_ADDRESS \
    $SAFE_ADDRESS \
    $FAUCET_CONTROLLER \
    $ROLLUP_PROVIDER_ADDRESS \
    $VERIFIER_TYPE \
    $UPGRADE
fi