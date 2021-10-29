#!/bin/bash
# In the event of circuits being changed, certain parts of the project need to be rebuilt.
# This is an extremely brute force approach to rebuilding things as it assumes everything needs updating.
# You're probably better off taking a more considered approach.

cd barretenberg/build
rm -rf ../src/aztec/rollup/proofs/root_rollup/fixtures
rm -rf ../src/aztec/rollup/proofs/root_verifier/fixtures
make rollup_proofs_tests
./src/aztec/rollup/proofs/rollup_proofs_tests --gtest_filter=root_rollup*
./src/aztec/rollup/proofs/rollup_proofs_tests --gtest_filter=root_verifier*
cd ../../blockchain
yarn generate:dev
