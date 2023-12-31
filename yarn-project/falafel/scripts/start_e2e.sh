#!/bin/sh
set -eu

if [ -z "${NO_BUILD-}" ]; then
  cmake --build ../../aztec-connect-cpp/build      --parallel --target rollup_cli --target db_cli
  cmake --build ../../aztec-connect-cpp/build-wasm --parallel --target aztec-connect.wasm

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
export INITIAL_RUNTIME_CONFIG_PATH=${INITIAL_RUNTIME_CONFIG_PATH:-"./config/e2e_test_initial_config.json"}
export ENABLE_SUBSIDIES=true

# Export contract addresses.
. ./scripts/export_addresses.sh

echo "Waiting for ethereum host at $ETHEREUM_HOST..."
while ! curl -s $ETHEREUM_HOST > /dev/null; do sleep 1; done;

yarn clean_db
yarn start