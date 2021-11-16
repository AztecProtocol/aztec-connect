#!/bin/bash
set -e
cd ../barretenberg
rm -rf build-vks
mkdir build-vks
cd build-vks
cmake .. && make -j$(nproc) keygen
./bin/keygen 1 2 ../../blockchain/contracts/verifier/keys