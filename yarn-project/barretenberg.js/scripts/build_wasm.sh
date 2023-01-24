#!/bin/bash
# Expects current working directory to be /yarn-project/barretenberg.js
set -e

cmake --build ../../aztec-connect-cpp/build      --parallel --target db_cli
cmake --build ../../aztec-connect-cpp/build-wasm --parallel --target aztec-connect.wasm