#!/bin/bash
set -e

yarn clean

cmake --build ../../aztec-connect-cpp/build      --parallel --target db_cli
cmake --build ../../aztec-connect-cpp/build-wasm --parallel --target aztec-connect.wasm

yarn build