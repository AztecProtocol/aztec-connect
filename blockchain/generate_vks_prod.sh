#!/bin/bash
set -e
pushd ../barretenberg/build && make -j$(nproc) keygen && popd
../barretenberg/build/src/aztec/rollup/keygen/keygen 8 1 ./contracts/verifier/keys ../barretenberg/srs_db/ignition