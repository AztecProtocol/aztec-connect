#!/bin/bash
set -e
cd ../barretenberg/build
make -j$(nproc) keygen
./src/aztec/rollup/keygen/keygen 28 32 ../../blockchain/contracts/verifier/keys

./create_rollup_proof.sh 1 28 1
./create_rollup_proof.sh 1 28 2
./create_rollup_proof.sh 1 28 4
./create_rollup_proof.sh 1 28 8
./create_rollup_proof.sh 1 28 16
./create_rollup_proof.sh 1 28 32