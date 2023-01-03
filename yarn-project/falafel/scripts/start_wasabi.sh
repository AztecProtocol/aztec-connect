#!/bin/bash
set -e

export FEE_GAS_PRICE_MULTIPLIER=0.0001
export ETHEREUM_POLL_INTERVAL=1000
export FLUSH_AFTER_IDLE=10
export DEFAULT_DEFI_BATCH_SIZE=10
export NUM_INNER_ROLLUP_TXS=1
export NUM_OUTER_ROLLUP_PROOFS=1
export VK=VerificationKey1x1

./scripts/start_e2e.sh