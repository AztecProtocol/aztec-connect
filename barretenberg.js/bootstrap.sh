#!/bin/bash
set -e

LINK_FOLDER="--link-folder `pwd`/../.yarn"

pushd ../barretenberg/build
cmake ..
make -j$(nproc) db_cli
cd ../build-wasm
cmake ..
make -j$(nproc) barretenberg.wasm
popd
yarn install
yarn build
yarn symlink-wasm
cd dest && yarn link $LINK_FOLDER
