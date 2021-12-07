#!/bin/sh
set -e

cd ../../../../../barretenberg
mkdir -p build && cd build && rm -rf ./data && cmake .. && make -j$(nproc) tx_factory rollup_cli
cd ../srs_db && ./download_ignition.sh 1
cd ../../blockchain/src/contracts/verifier/fixtures

# input format: num_txs | data_dir | inner size | outer size | valid outer sizes
./create_rollup_proof.sh 1 ./data 1 2 2
