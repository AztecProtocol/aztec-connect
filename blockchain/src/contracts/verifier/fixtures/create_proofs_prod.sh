#!/bin/bash
set -e
rm -rf ../../../../../barretenberg/build/data

# input format:
# num_txs | split proofs ? | data_dir | inner size | outer size | valid outer sizes |
./create_rollup_proof.sh 1 0 ./data 28 1 1,2,4
./create_rollup_proof.sh 1 0 ./data 28 2 1,2,4
./create_rollup_proof.sh 1 0 ./data 28 4 1,2,4