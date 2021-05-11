#!/bin/bash
set -e
pushd ../barretenberg/build
cmake .. && make -j$(nproc) keygen
./src/aztec/rollup/keygen/keygen 1 4 ../../blockchain/contracts/verifier/keys
popd

# cd ./test/verifier/fixtures
# ./create_dev_proofs.sh
