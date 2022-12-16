#!/bin/bash

if [ $DEPLOY_CONTRACTS ]; then
    # create output directory
    mkdir -p serve/
    mkdir -p serve/1
    mkdir -p serve/1337
    mkdir -p serve/3567
    mkdir -p serve/677868
    echo "Created output directory"

    # Set Rollup provider address to the deployer if none is provided
    DEPLOYER_ADDRESS=$(cast w a --private-key "$PRIVATE_KEY")
    ROLLUP_PROVIDER_ADDRESS=${ROLLUP_PROVIDER_ADDRESS:-$DEPLOYER_ADDRESS}
    FAUCET_CONTROLLER=${FAUCET_CONTROLLER:-$DEPLOYER_ADDRESS}

    echo "Deploying contracts"    
    echo "Deploying from: $DEPLOYER_ADDRESS"

    # NOTE: hard coded at 50 gwei + using legacy flag to support ganache
    forge script E2ESetup --ffi --private-key $PRIVATE_KEY --legacy --with-gas-price 50000000000 --broadcast --rpc-url $ETHEREUM_HOST --sig "deploy(address,address,address,address,string,bool)" \
        $DEPLOYER_ADDRESS \
        $SAFE_ADDRESS \
        $FAUCET_CONTROLLER \
        $ROLLUP_PROVIDER_ADDRESS \
        $VERIFIER_TYPE \
        $UPGRADE
fi