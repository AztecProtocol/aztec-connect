#!/bin/bash
set -e

yarn install
yarn link barretenberg
yarn link @aztec/sdk