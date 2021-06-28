#!/bin/bash
# In the event of circuits being changed, certain parts of the project need to be rebuilt. This script handles it.

cd barretenberg/build
rm -rf ../src/aztec/rollup/proofs/root_rollup/fixtures
make rollup_proofs_tests
./src/aztec/rollup/proofs/rollup_proofs_tests --gtest_filter=root_rollup*
cd ../../blockchain
yarn generate:dev
