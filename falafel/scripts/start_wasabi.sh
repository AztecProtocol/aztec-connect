#!/bin/sh
set -e

ETHEREUM_HOST=http://localhost:8545
HALLOUMI_HOST=http://localhost:8083

INITIAL_ETH_SUPPLY=1000000000000000000000

BASE_TX_GAS=10000
PUBLISH_INTERVAL=3600
NUM_INNER_ROLLUP_TXS=28
NUM_OUTER_ROLLUP_PROOFS=4

yarn clean_db
yarn build
`yarn -s deploy_rollup_processor 10000`
yarn start