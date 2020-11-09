#!/bin/bash
set -e

pushd ../barretenberg/build
make -j$(nproc) db_cli
cd ../build-wasm
make -j$(nproc) barretenberg.wasm
popd
yarn install
yarn build
yarn symlink-wasm
cd dest && { yarn unlink 2> /dev/null || true; } && yarn link