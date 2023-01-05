#!/bin/sh
set -eu

if [ -z "${NO_BUILD-}" ]; then
  cd  ../../barretenberg/build
  make -j$(nproc) rollup_cli db_cli
  cd  ../build-wasm
  make -j$(nproc) barretenberg.wasm
  cd ../../yarn-project/falafel
  yarn build
fi

# Hosts
export ETHEREUM_HOST=${ETHEREUM_HOST:-http://localhost:8545}
export CONTRACTS_HOST=${CONTRACTS_HOST:-http://localhost:8547}

# Falafel
export MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW=1
export NUM_INNER_ROLLUP_TXS=${NUM_INNER_ROLLUP_TXS:-3}
export NUM_OUTER_ROLLUP_PROOFS=${NUM_OUTER_ROLLUP_PROOFS:-2}
export ETHEREUM_POLL_INTERVAL=1000
export FEE_GAS_PRICE_MULTIPLIER=0.01
export FEE_PAYING_ASSET_IDS=0,1
export PROVERLESS=${PROVERLESS:-true}

# Export contract addresses.
. ./scripts/export_addresses.sh

echo "Waiting for ethereum host at $ETHEREUM_HOST..."
while ! curl -s $ETHEREUM_HOST > /dev/null; do sleep 1; done;

yarn clean_db
yarn start