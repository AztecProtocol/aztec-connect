#!/bin/bash
set -e
cd ../barretenberg
rm -rf build-vks
mkdir build-vks
cd build-vks
cmake .. && make -j$(nproc) keygen
./bin/keygen 28 1,2,4 ../../blockchain/contracts/verifier/keys