#!/bin/bash
set -e
cd ../barretenberg
rm -rf build-vks
mkdir build-vks
cd build-vks
cmake .. && make -j$(nproc) keygen
# running ./keygen n a,b,c dir 
# generates a key for verifying root rollups of shape nxa, nxb or nxc.
./src/aztec/rollup/keygen/keygen 1 2 ../../blockchain/contracts/verifier/keys