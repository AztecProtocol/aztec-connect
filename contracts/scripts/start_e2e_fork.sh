#!/bin/bash
set -eu pipefail

export FORK_BLOCK=15918000
export FORK_URL=https://mainnet.infura.io/v3/9928b52099854248b3a096be07a6b23c
export CHAIN_ID=3630

./scripts/start_e2e.sh