#!/bin/bash
set -e

yarn clean

pushd ../../barretenberg/build
make -j$(nproc) db_cli
cd ../build-wasm
make -j$(nproc) barretenberg.wasm
popd

yarn build