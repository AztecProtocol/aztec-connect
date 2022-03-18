#!/bin/bash
set -e

LINK_FOLDER="--link-folder `pwd`/../.yarn"

pushd ../barretenberg/build
make -j$(nproc) db_cli
cd ../build-wasm
make -j$(nproc) barretenberg.wasm
popd

yarn install --frozen-lockfile
yarn link $LINK_FOLDER @aztec/barretenberg
yarn link $LINK_FOLDER @aztec/blockchain
yarn link $LINK_FOLDER halloumi
yarn build