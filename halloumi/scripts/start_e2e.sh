#!/bin/sh
set -e

cd  ../barretenberg/build
make -j$(nproc) rollup_cli
cd ../../halloumi

export ROLLUP_OUTERS=2
export PERSIST=false
export PROVERLESS=${1:-true}

yarn build
yarn start