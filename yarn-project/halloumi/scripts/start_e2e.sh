#!/bin/sh
set -eu

cd  ../../barretenberg/build
make -j$(nproc) rollup_cli
cd ../../yarn-project/halloumi

export NUM_INNER_ROLLUP_TXS=${NUM_INNER_ROLLUP_TXS:-3}
export NUM_OUTER_ROLLUP_PROOFS=${NUM_OUTER_ROLLUP_PROOFS:-2}
export PERSIST=false
export PROVERLESS=${1:-true}
export LAZY_INIT=${2:-false}

yarn build
yarn start