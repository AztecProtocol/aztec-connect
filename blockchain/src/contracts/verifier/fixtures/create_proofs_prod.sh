#!/bin/sh
set -e

cd ../../../../../barretenberg
rm -rf ./data && mkdir -p build && cd build && cmake .. && make -j$(nproc) tx_factory rollup_cli
cd ../../blockchain/src/contracts/verifier/fixtures

# input format: num_txs | data_dir | inner size | outer size | valid outer sizes
./create_rollup_proof.sh 1 ./data 28 1 1,2,4
./create_rollup_proof.sh 1 ./data 28 2 1,2,4
./create_rollup_proof.sh 1 ./data 28 4 1,2,4