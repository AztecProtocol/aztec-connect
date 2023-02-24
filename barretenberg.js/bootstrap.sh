#!/bin/bash
set -e

yarn clean

./scripts/build_wasm.sh

yarn build

# Build ./src/wasm/node_worker.js.
# Needed for unit tests until node 18 + yarn pnp + ts-node chained loader stuff works.
yarn build:dev:worker
