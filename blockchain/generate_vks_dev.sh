#!/bin/bash
set -e
cd ../barretenberg && mkdir -p build && cd build && cmake .. && make -j$(nproc) keygen
./bin/keygen 3 2 ../../blockchain/contracts/verifier/keys
cd ../../blockchain
yarn compile