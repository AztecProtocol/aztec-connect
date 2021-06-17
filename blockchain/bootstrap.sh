#!/bin/bash
set -e

yarn install
yarn link @aztec/barretenberg
yarn build
cd dest && { yarn unlink 2> /dev/null || true; } && yarn link