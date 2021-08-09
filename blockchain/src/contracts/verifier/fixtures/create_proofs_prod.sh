#!/bin/bash
set -e
rm -rf ../../../../barretenberg/build/data
./create_rollup_proof.sh 1 28 1
./create_rollup_proof.sh 1 28 2
./create_rollup_proof.sh 1 28 4
