#!/bin/bash
set -e
rm -rf ../../../../../barretenberg/build/data

# input format: 
# num_txs | split proofs ? | data_dir | inner size | outer size | 
#   | valid outer sizes described as in 28xa,28xb,28xc |

./create_rollup_proof.sh 1 0 ./data 28 1 28x1,28x2,28x4
./create_rollup_proof.sh 1 0 ./data 28 2 28x1,28x2,28x4
./create_rollup_proof.sh 1 0 ./data 28 4 28x1,28x2,28x4