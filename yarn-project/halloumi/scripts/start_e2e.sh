#!/bin/sh
set -eu

cmake --build ../../aztec-connect-cpp/build --parallel --target rollup_cli

export NUM_INNER_ROLLUP_TXS=${NUM_INNER_ROLLUP_TXS:-3}
export NUM_OUTER_ROLLUP_PROOFS=${NUM_OUTER_ROLLUP_PROOFS:-2}
export PERSIST=false
export PROVERLESS=${1:-true}
export LAZY_INIT=${2:-false}

yarn build
yarn start