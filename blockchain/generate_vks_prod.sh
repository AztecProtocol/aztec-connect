#!/bin/bash
set -e
cd ../barretenberg/build
make -j$(nproc) keygen
./src/aztec/rollup/keygen/keygen 28 32 ../../blockchain/contracts/verifier/keys