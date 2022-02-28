#!/bin/sh
set -e

cd  ../barretenberg/build
make -j$(nproc) rollup_cli db_cli
cd  ../build-wasm
make -j$(nproc) barretenberg.wasm
cd ../../falafel

# Hosts
export ETHEREUM_HOST=http://localhost:8545
export HALLOUMI_HOST=http://localhost:8083

# Deploy
export INITIAL_ETH_SUPPLY=1000000000000000000000
export VK=MockVerificationKey

# Falafel
export BASE_TX_GAS=10000
export PUBLISH_INTERVAL=3600
export NUM_INNER_ROLLUP_TXS=28
export NUM_OUTER_ROLLUP_PROOFS=4

yarn clean_db
yarn build
`yarn -s deploy_rollup_processor 10000`
yarn start