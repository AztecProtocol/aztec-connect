#!/bin/bash
set -e
cd ../barretenberg
rm -rf build-vks
mkdir build-vks
cd build-vks
cmake .. && make -j$(nproc) keygen
./src/aztec/rollup/keygen/keygen 28 4 ../../blockchain/contracts/verifier/keys