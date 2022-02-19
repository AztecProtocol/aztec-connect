#!/bin/sh
set -e

cd  ../barretenberg/build
make -j$(nproc) rollup_cli
cd ../../halloumi

export ROLLUP_OUTERS=2
export NUM_INNER_ROLLUP_TXS=3
export NUM_OUTER_ROLLUP_PROOFS=2
export PERSIST=false
export PROVERLESS=${1:-true}

yarn build
yarn start