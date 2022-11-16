#!/bin/bash
# Expects current working directory to be /yarn-project/barretenberg.js
# Skip cmake if first arg is set.
# Skip building db_cli if second arg is set.
set -e

if [[ "$OSTYPE" == "darwin"* ]]; then
  export BREW_PREFIX=$(brew --prefix)
fi

pushd ../../barretenberg/build
if [ -z "$1" ]; then
  cmake ..
fi
if [ -z "$2" ]; then
  cmake --build . --parallel --target db_cli
fi
cd ../build-wasm
if [ -z "$1" ]; then
  cmake ..
fi
cmake --build . --parallel --target barretenberg.wasm
popd