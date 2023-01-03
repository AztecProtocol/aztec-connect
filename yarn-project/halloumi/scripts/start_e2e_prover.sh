#!/bin/sh
set -eu

export NUM_INNER_ROLLUP_TXS=1
export NUM_OUTER_ROLLUP_PROOFS=1
export PROVERLESS=false

./scripts/start_e2e.sh