#!/bin/bash
set -e

if [ -d "./src" ]; then
  (cd ../../../aztec-connect-cpp/ && mkdir -p build && cd build && rm -rf ./data && cmake .. && cmake --build . --parallel --target tx_factory --target rollup_cli)
fi

(cd ../../../aztec-connect-cpp/barretenberg/cpp/srs_db && ./download_ignition.sh 1)

# input format: num_txs | inner size | outer size | is mock
./create_rollup_proof.sh 4 3 2 true
./create_rollup_proof.sh 1 1 1 false

yarn build && yarn node ../dest