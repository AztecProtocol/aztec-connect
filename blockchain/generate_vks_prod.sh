#!/bin/bash
set -e
pushd ../barretenberg/build && make -j$(nproc) keygen && popd
../barretenberg/build/src/aztec/rollup/keygen/keygen 28 896 ./contracts/verifier/keys ../barretenberg/srs_db/ignition