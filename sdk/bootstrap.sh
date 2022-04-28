#!/bin/bash
set -e

LINK_FOLDER="--link-folder `pwd`/../.yarn"

yarn unlink $LINK_FOLDER >/dev/null 2>&1 || true
yarn clean
rm -rf node_modules

yarn install --frozen-lockfile
yarn link $LINK_FOLDER @aztec/barretenberg
yarn link $LINK_FOLDER @aztec/blockchain
yarn build
cd dest && yarn link $LINK_FOLDER