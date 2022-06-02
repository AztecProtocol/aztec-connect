#!/bin/bash
set -e

LINK_FOLDER="--link-folder `pwd`/../.yarn"

yarn unlink $LINK_FOLDER >/dev/null 2>&1 || true
yarn clean:first
rm -rf node_modules

yarn install --frozen-lockfile
yarn link $LINK_FOLDER @aztec/barretenberg
yarn build
cd dest && yarn link $LINK_FOLDER