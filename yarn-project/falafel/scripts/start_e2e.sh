#!/bin/sh
set -e

cd  ../../barretenberg/build
make -j$(nproc) rollup_cli db_cli
cd  ../build-wasm
make -j$(nproc) barretenberg.wasm
cd ../../yarn-project/falafel

# Deploy contracts
export VK=$1

# Hosts
export ETHEREUM_HOST=http://localhost:8546 # change port to 8545 to run locally WITHOUT Kebab
export HALLOUMI_HOST=http://localhost:8083

# Falafel
export MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW=1
export NUM_INNER_ROLLUP_TXS=3
export NUM_OUTER_ROLLUP_PROOFS=2
export ETHEREUM_POLL_INTERVAL=1000
export FEE_GAS_PRICE_MULTIPLIER=0.01
export FEE_PAYING_ASSET_IDS=0,1
if [ -z "$VK" ]; then
  export PROVERLESS=true
fi

yarn build
yarn clean_db
yarn start