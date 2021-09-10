#!/bin/bash
set -e
rm -rf ../../../../../barretenberg/build/data
./create_rollup_proof.sh 1 1 1 0
./create_rollup_proof.sh 1 1 2 0
./create_rollup_proof.sh 1 1 4 0