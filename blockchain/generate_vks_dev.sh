#!/bin/bash
set -e
cd ../barretenberg && mkdir build && cd build && cmake .. && make -j$(nproc) keygen
./bin/keygen 1 2 ../../blockchain/contracts/verifier/keys