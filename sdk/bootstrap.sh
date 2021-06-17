#!/bin/bash
set -e

yarn install
yarn link @aztec/barretenberg
yarn link @aztec/blockchain
yarn link @aztec/sriracha
yarn build
cd dest && { yarn unlink 2> /dev/null || true; } && yarn link