#!/bin/sh
set -e

cd  ../barretenberg/build
make -j$(nproc) rollup_cli
cd ../../halloumi

export ROLLUP_OUTERS=2
export PERSIST=false

yarn clean_data
yarn build
yarn start