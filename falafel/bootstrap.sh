#!/bin/bash
set -e

pushd ../barretenberg/build
make -j$(nproc) db_cli
cd ../build-wasm
make -j$(nproc) barretenberg.wasm
popd
yarn install
yarn link barretenberg
yarn link blockchain
yarn link halloumi
yarn build