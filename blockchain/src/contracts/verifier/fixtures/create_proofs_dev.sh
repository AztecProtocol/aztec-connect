#!/bin/bash
set -e
cd ../../../../../barretenberg
rm -rf build-vks && mkdir build-vks && cd build-vks && cmake ..
cd ../../blockchain/src/contracts/verifier/fixtures
./create_rollup_proof.sh 1 1 1 0
./create_rollup_proof.sh 1 1 2 0
./create_rollup_proof.sh 1 1 4 0