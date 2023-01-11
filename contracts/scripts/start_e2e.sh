#!/bin/bash
set -eu pipefail

trap 'kill $(jobs -p)' SIGTERM

if [ -z "${ETHEREUM_HOST-}" ]; then
  ANVIL_PORT=${ANVIL_PORT:-8544}

  # We've not been given an ethereum host. We will run our own anvil.
  export ETHEREUM_HOST=http://localhost:$ANVIL_PORT

  if nc -z localhost 8544; then
    echo "Port 8544 already open, close it first so we can run anvil."
    exit 1
  fi

  [ -n "${FORK_URL-}" ] && FORK_URL_ARG="--fork-url $FORK_URL"
  [ -n "${FORK_BLOCK-}" ] && FORK_BLOCK_ARG="--fork-block-number $FORK_BLOCK"
  CHAIN_ID_ARG="--chain-id ${CHAIN_ID:-1337}"

  # Start anvil and wait till its port is open.
  if [ -n "${VERBOSE-}" ]; then
    .foundry/bin/anvil ${FORK_BLOCK_ARG-} ${FORK_URL_ARG-} $CHAIN_ID_ARG --host :: -p $ANVIL_PORT &
  else
    .foundry/bin/anvil ${FORK_BLOCK_ARG-} ${FORK_URL_ARG-} $CHAIN_ID_ARG --host :: -p $ANVIL_PORT > /dev/null &
  fi
fi

echo "Waiting for ethereum host at $ETHEREUM_HOST..."
while ! curl -s $ETHEREUM_HOST > /dev/null; do sleep 1; done;

# Deploy contracts.
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 # Test account #0
export SAFE_ADDRESS=0x7095057A08879e09DC1c0a85520e3160A0F67C96
./scripts/deploy_contracts.sh

PORT=${PORT:-8547}
echo "Serving contracts output on $PORT"
socat TCP-LISTEN:$PORT,crlf,reuseaddr,fork SYSTEM:"echo HTTP/1.0 200; echo Content-Type\: text/plain; echo; cat ./serve/contract_addresses.json" &
wait