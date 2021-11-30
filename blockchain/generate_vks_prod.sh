#!/bin/bash
set -e
cd ../barretenberg && mkdir -p build && cd build && cmake .. && make -j$(nproc) keygen
./bin/keygen 28 1,2,4 ../../blockchain/contracts/verifier/keys
