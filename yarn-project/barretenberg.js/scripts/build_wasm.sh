#!/bin/bash
# Expects current working directory to be /yarn-project/barretenberg.js
# Skip cmake if first arg is set.
# Skip building db_cli if second arg is set.
set -e

pushd ../../barretenberg/build
if [ -z "$1" ]; then
  cmake ..
fi
if [ -z "$2" ]; then
  make -j$(nproc) db_cli
fi
cd ../build-wasm
if [ -z "$1" ]; then
  cmake ..
fi
make -j$(nproc) barretenberg.wasm
popd