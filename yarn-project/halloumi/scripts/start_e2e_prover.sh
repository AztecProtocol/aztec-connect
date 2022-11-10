#!/bin/sh
set -e

cd  ../../barretenberg/build
make -j$(nproc) rollup_cli
cd ../../yarn-project/halloumi

export NUM_INNER_ROLLUP_TXS=1
export NUM_OUTER_ROLLUP_PROOFS=1
export PERSIST=false
export PROVERLESS=false
export LAZY_INIT=false

yarn build
yarn start