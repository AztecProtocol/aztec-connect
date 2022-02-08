#!/bin/sh
set -e

cd  ../barretenberg/build
make -j$(nproc) rollup_cli db_cli
cd  ../build-wasm
make -j$(nproc) barretenberg.wasm
cd ../../falafel

export ETHEREUM_HOST=http://localhost:8545
export HALLOUMI_HOST=http://localhost:8083

export ESCAPE_BLOCK_LOWER=10
export ESCAPE_BLOCK_UPPER=100
export VK=MockVerificationKey

export MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW=1
export BASE_TX_GAS=10000
export PUBLISH_INTERVAL=120
export NUM_INNER_ROLLUP_TXS=3
export NUM_OUTER_ROLLUP_PROOFS=2
export ETHEREUM_POLL_INTERVAL=1000

if [ -n "$VK" ]; then
  export PROVERLESS=true
fi

 yarn clean_db
 yarn build
`yarn -s deploy_rollup_processor`
yarn start