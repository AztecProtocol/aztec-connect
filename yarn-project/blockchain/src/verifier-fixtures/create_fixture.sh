#!/bin/bash
set -e

cd ../../../../barretenberg
mkdir -p build && cd build && rm -rf ./data && cmake .. && make -j$(nproc) tx_factory rollup_cli
cd ../srs_db && ./download_ignition.sh 0
cd ../../yarn-project/blockchain/src/verifier-fixtures

# input format: num_txs | inner size | outer size
./create_rollup_proof.sh 4 3 2 true
./create_rollup_proof.sh 1 1 1 false

cd ../.. && rm -rf dest .tsbuildinfo && yarn tsc -b tsconfig.dest.json
cd src/verifier-fixtures && yarn ts-node ../../dest/verifier-fixtures/index.js
cd ../.. && rm -rf dest .tsbuildinfo 