#!/bin/bash
set -e
rm -rf ../../../../../barretenberg/build/data
./create_rollup_proof.sh 1 1 1 0
./create_rollup_proof.sh 1 1 2 0
# create a 2x2 rollup where each rollup contains 1 transaction.
# Used to check we correctly encode/decode padding proofs
./create_rollup_proof.sh 2 2 2 1