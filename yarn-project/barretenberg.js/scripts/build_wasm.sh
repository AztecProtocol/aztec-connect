#!/bin/bash
# Expects current working directory to be /yarn-project/barretenberg.js
set -e

pushd ../../barretenberg/cpp/build
cmake --build . --parallel --target db_cli
cd ../build-wasm
cmake --build . --parallel --target barretenberg.wasm
popd