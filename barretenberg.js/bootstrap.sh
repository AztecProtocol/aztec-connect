#!/bin/bash
set -e

LINK_FOLDER="--link-folder `pwd`/../.yarn"

yarn unlink $LINK_FOLDER >/dev/null 2>&1 || true
yarn clean
rm -rf node_modules

pushd ../barretenberg/build
cmake ..
make -j$(nproc) db_cli
cd ../build-wasm
cmake ..
make -j$(nproc) barretenberg.wasm
popd

yarn install --frozen-lockfile
yarn build
yarn symlink-wasm
cd dest && yarn link $LINK_FOLDER
