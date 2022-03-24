#!/bin/bash
set -e

LINK_FOLDER="--link-folder `pwd`/../.yarn"

yarn clean
rm -rf node_modules

yarn install
yarn link $LINK_FOLDER @aztec/sdk
yarn link $LINK_FOLDER @aztec/barretenberg
yarn link $LINK_FOLDER @aztec/blockchain