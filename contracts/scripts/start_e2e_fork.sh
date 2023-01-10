#!/bin/bash
set -eu pipefail

export FORK_BLOCK=15918000
export FORK_URL=https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35
export CHAIN_ID=3630

./scripts/start_e2e.sh