#!/bin/bash
set -e

LINK_FOLDER="--link-folder `pwd`/../.yarn"

yarn unlink $LINK_FOLDER >/dev/null 2>&1 || true
yarn clean
rm -rf node_modules

pushd ../barretenberg/build
make -j$(nproc) rollup_cli
popd
yarn install --frozen-lockfile
yarn link $LINK_FOLDER @aztec/barretenberg
yarn build
cd dest && yarn link $LINK_FOLDER