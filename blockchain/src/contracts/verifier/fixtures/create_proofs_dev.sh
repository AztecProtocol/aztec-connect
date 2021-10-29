#!/bin/bash
set -e

cd ../../../../../barretenberg
rm -rf build-vks && mkdir build-vks && cd build-vks && cmake ..
cd ../../blockchain/src/contracts/verifier/fixtures

# input format:
# num_txs | split proofs ? | data_dir | inner size | outer size |
#   | valid outer sizes described as in 1xa,1xb,1xc |
./create_rollup_proof.sh 1 0 ./data 1 2 1x2