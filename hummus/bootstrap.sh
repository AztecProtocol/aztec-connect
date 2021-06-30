#!/bin/bash
set -e

yarn install
yarn link @aztec/sdk
yarn link @aztec/barretenberg
yarn link @aztec/blockchain
yarn build