#!/bin/bash
set -e

# Do not deploy if a mainnet deployment
case $VERSION_TAG in
  testnet)
    TAG=TEST
    ;;
  dev)
    TAG=DEV
    ;;
  stage)
    TAG=STAGE
    ;;
  *)
    echo "No configuration for VERSION_TAG=$VERSION_TAG, skipping contract deployment."
    exit 0
    ;;
esac

# DECLARE INTERMEDIATE VARIABLES
FORK_BASE=https://aztec-connect-$VERSION_TAG-mainnet-fork.aztec.network:8545
declare API_KEY_VAL=$(eval echo "\$${TAG}_FORK_API_KEY")
declare PRIVATE_KEY_VAL=$(eval echo "\$${TAG}_FORK_CONTRACTS_DEPLOYER_PRIVATE_KEY")
declare DEPLOYER_VAL=$(eval echo "\$${TAG}_FORK_CONTRACTS_DEPLOYER_ADDRESS")
declare FAUCET_VAL=$(eval echo "\$${TAG}_FORK_FAUCET_OPERATOR_ADDRESS")
declare ROLLUP_VAL=$(eval echo "\$${TAG}_FORK_ROLLUP_PROVIDER_ADDRESS")

# EXPORT VARIABLES
export API_KEY="$API_KEY_VAL"
export PRIVATE_KEY="$PRIVATE_KEY_VAL"
export DEPLOYER_ADDRESS="$DEPLOYER_VAL"
export FAUCET_CONTROLLER="$FAUCET_VAL"
export ROLLUP_PROVIDER_ADDRESS="$ROLLUP_VAL"
export ETHEREUM_HOST="$FORK_BASE/$API_KEY"

LAST_COMMIT=$(last_successful_commit contracts $DEPLOY_TAG-deployed)

if [ -z "$LAST_COMMIT" ]; then
  echo "No successful last deploy found. Change .redeploy to manually trigger a deployment."
elif changed $LAST_COMMIT "contracts/deploy/$VERSION_TAG" || [ "$FORCE_DEPLOY" == "true" ]; then
  echo "Redeploying contracts..."

  mkdir -p serve
  # Contract addresses will be mounted in the serve directory
  docker run \
    -v $(pwd)/serve:/usr/src/contracts/serve \
    -e ETHEREUM_HOST=$ETHEREUM_HOST -e PRIVATE_KEY=$PRIVATE_KEY -e FAUCET_CONTROLLER=$FAUCET_CONTROLLER -e ROLLUP_PROVIDER_ADDRESS=$ROLLUP_PROVIDER_ADDRESS \
    278380418400.dkr.ecr.eu-west-2.amazonaws.com/contracts:$COMMIT_HASH

  # Write the contract addresses as terraform variables
  for KEY in ROLLUP_CONTRACT_ADDRESS PERMIT_HELPER_CONTRACT_ADDRESS GAS_PRICE_FEED_CONTRACT_ADDRESS DAI_PRICE_FEED_CONTRACT_ADDRESS FEE_DISTRIBUTOR_ADDRESS BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS FAUCET_CONTRACT_ADDRESS; do
    VALUE=$(jq -r .$KEY ./serve/contract_addresses.json)
    export TF_VAR_$KEY=$VALUE
  done
  export TF_VAR_PRICE_FEED_CONTRACT_ADDRESSES="$TF_VAR_GAS_PRICE_FEED_CONTRACT_ADDRESS,$TF_VAR_DAI_PRICE_FEED_CONTRACT_ADDRESS"

  # Write state variables
  deploy_terraform contracts ./terraform/$VERSION_TAG
fi

tag_remote_image contracts cache-$COMMIT_HASH cache-$COMMIT_HASH-$DEPLOY_TAG-deployed