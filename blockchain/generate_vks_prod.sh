#!/bin/bash
set -e
pushd ../barretenberg/build
make -j$(nproc) keygen
./src/aztec/rollup/keygen/keygen 28 4 ../../blockchain/contracts/verifier/keys
popd

# cd ./test/verifier/fixtures
# ./create_prod_proofs.sh