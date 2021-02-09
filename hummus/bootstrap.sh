#!/bin/bash
set -e

yarn install
yarn link barretenberg
yarn link blockchain
yarn link @aztec/sdk