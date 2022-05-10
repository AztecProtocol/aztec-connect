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

# Falafel
export MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW=1
export FEE_GAS_PRICE_MULTIPLIER=0.0001
export NUM_INNER_ROLLUP_TXS=3
export NUM_OUTER_ROLLUP_PROOFS=2
export ETHEREUM_POLL_INTERVAL=1000
export PROVERLESS=true
export FLUSH_AFTER_IDLE=10
export DEFAULT_DEFI_BATCH_SIZE=10

yarn clean_db
yarn build
`yarn -s deploy_rollup_processor`
yarn start