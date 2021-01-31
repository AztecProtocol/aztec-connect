#!/bin/bash
set -e
pushd ../barretenberg/build && make -j$(nproc) keygen && popd
../barretenberg/build/src/aztec/rollup/keygen/keygen 1 4 ./contracts/verifier/keys ../barretenberg/srs_db/ignition

cd ./test/verifier/fixtures
./create_rollup_proof.sh