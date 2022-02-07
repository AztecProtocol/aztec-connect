#!/bin/bash
set -e

MOCK_PROOF=$1
CONDITIONAL=$2

if [ -n "$CONDITIONAL" -a -f rollup_proof_data_3x2.dat ]; then
  exit 0;
fi

cd ../../../../../barretenberg
mkdir -p build && cd build && rm -rf ./data && cmake .. && make -j$(nproc) tx_factory rollup_cli
cd ../srs_db && ./download_ignition.sh 1
cd ../../blockchain/src/contracts/verifier/fixtures

# input format: num_txs | data_dir | inner size | outer size | valid outer sizes
./create_rollup_proof.sh 4 ./data 3 2 $MOCK_PROOF
