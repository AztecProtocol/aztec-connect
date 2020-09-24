#!/bin/bash
set -e
pushd ../barretenberg/build && make -j$(nproc) keygen && popd
../barretenberg/build/src/aztec/rollup/keygen/keygen 1 ../barretenberg/srs_db/ignition > ./contracts/verifier/keys/Rollup1Vk.sol
../barretenberg/build/src/aztec/rollup/keygen/keygen 2 ../barretenberg/srs_db/ignition > ./contracts/verifier/keys/Rollup2Vk.sol
../barretenberg/build/src/aztec/rollup/keygen/keygen 3 ../barretenberg/srs_db/ignition > ./contracts/verifier/keys/Rollup3Vk.sol
../barretenberg/build/src/aztec/rollup/keygen/keygen eh ../barretenberg/srs_db/ignition > ./contracts/verifier/keys/EscapeHatchVk.sol
