#!/bin/bash
set -e

yarn install
yarn link @aztec/sdk
yarn link barretenberg
yarn link blockchain
