#!/bin/sh
set -e

if [ -z "${NO_BUILD-}" ]; then
  yarn build
fi

export ETHEREUM_HOST=${ETHEREUM_HOST:-http://localhost:8544}
export CONTRACTS_HOST=${CONTRACTS_HOST:-http://localhost:8547}
export ALLOW_PRIVILEGED_METHODS=true
export ADDITIONAL_PERMITTED_METHODS=net_version

echo "Waiting for contracts host at $CONTRACTS_HOST..."
while ! curl -s $CONTRACTS_HOST > /dev/null; do sleep 1; done;

export ROLLUP_CONTRACT_ADDRESS=$(curl -s $CONTRACTS_HOST | jq -r .ROLLUP_CONTRACT_ADDRESS)

yarn clean_db
yarn start