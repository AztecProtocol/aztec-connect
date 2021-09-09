#!/bin/bash
set -e
cd ../barretenberg
rm -rf build-vks
mkdir build-vks
cd build-vks
cmake .. && make -j$(nproc) keygen
./src/aztec/rollup/keygen/keygen 1 2 ../../blockchain/contracts/verifier/keys
# create a 2x2 rollup where each rollup contains 1 transaction.
# Used to check we correctly encode/decode padding proofs
./src/aztec/rollup/keygen/keygen 2 2 ../../blockchain/contracts/verifier/keys
