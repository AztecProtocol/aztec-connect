#!/bin/sh
set -eu

# Sets up defaults then runs the E2E Setup script to perform contract deployments
#
# Expected enviornment variables
# - ROLLUP_PROVIDER_ADDRESS - The address capable of submitting rollups, will default to deployer
# - FAUCET_CONTROLLER - Faucet superuser, will default to deployer
# - SAFE_ADDRESS - Permissioned address - usually multisig, will default to deployer
# - VERIFIER_TYPE - The type of verifier that is used, test environments will use the MockVerifier
# - ETHEREUM_HOST - Target chain rpc
# - PRIVATE_KEY - Deployer key

# Create serve directory in which we save contract_addresses.json.
mkdir -p serve/
echo "Created output directory"

# Required for deploying aztec-connect-bridges bridges
export NETWORK=${NETWORK:-None}
export SIMULATE_ADMIN=${SIMULATE_ADMIN:-false}

# Set Rollup provider address to the deployer if none is provided
TEMP=$(cast w a --private-key "$PRIVATE_KEY")
# For me, Cast returns 'Address: <Address Value>'. Remove the prefix if present
WITHOUT_PREFIX=${TEMP#*: }
DEPLOYER_ADDRESS=$WITHOUT_PREFIX
ROLLUP_PROVIDER_ADDRESS=${ROLLUP_PROVIDER_ADDRESS:-$DEPLOYER_ADDRESS}
FAUCET_CONTROLLER=${FAUCET_CONTROLLER:-$DEPLOYER_ADDRESS}
SAFE_ADDRESS=${SAFE_ADDRESS:-$DEPLOYER_ADDRESS}
VERIFIER_TYPE=${VK:-'MockVerifier'}
UPGRADE=${UPGRADE:=true}

echo "Deploying contracts from: $DEPLOYER_ADDRESS"

# Execute deployment solidity script
forge script E2ESetup --ffi --private-key $PRIVATE_KEY --broadcast --rpc-url $ETHEREUM_HOST --sig "deploy(address,address,address,address,string,bool)" \
  $DEPLOYER_ADDRESS \
  $SAFE_ADDRESS \
  $FAUCET_CONTROLLER \
  $ROLLUP_PROVIDER_ADDRESS \
  $VERIFIER_TYPE \
  $UPGRADE