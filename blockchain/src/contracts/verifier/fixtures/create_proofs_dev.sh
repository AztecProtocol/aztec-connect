#!/bin/bash
set -e

cd ../../../../../barretenberg
rm -rf build-vks && mkdir build-vks && cd build-vks && cmake ..
cd ../../blockchain/src/contracts/verifier/fixtures

# input format:
# num_txs | split proofs ? | data_dir | inner size | outer size | valid outer sizes |
./create_rollup_proof.sh 1 0 ./data 1 2 2