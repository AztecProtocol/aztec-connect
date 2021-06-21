#!/bin/bash
set -e
pushd ../barretenberg/build
cmake .. && make -j$(nproc) keygen
./src/aztec/rollup/keygen/keygen 28 4 ../../blockchain/contracts/verifier/keys
popd