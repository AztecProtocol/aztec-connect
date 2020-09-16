#!/bin/bash
set -e

yarn install
yarn link barretenberg
yarn link sriracha
yarn build
cd dest && { yarn unlink 2> /dev/null || true; } && yarn link