#!/bin/bash
set -e
cd ../barretenberg
rm -rf build-vks
mkdir build-vks
cd build-vks
cmake .. && make -j$(nproc) standard_plonk_proofkeygen
./src/aztec/rollup/standard_plonk_proofkeygen/standard_plonk_proofkeygen 1 ../../blockchain/contracts/verifier/keys
