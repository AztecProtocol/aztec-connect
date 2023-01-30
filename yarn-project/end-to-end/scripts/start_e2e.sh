#! /bin/sh
set -eu

CONTRACTS_HOST=${CONTRACTS_HOST:-http://localhost:8547}
ROLLUP_HOST=${ROLLUP_HOST:-http://localhost:8081}

# Wait for host
echo "Waiting for contracts host at $CONTRACTS_HOST..."
while ! curl -s $CONTRACTS_HOST > /dev/null; do sleep 1; done;

# Tests that directly interact with the contracts now have knowledge of them 
for KEY in ROLLUP_CONTRACT_ADDRESS DAI_CONTRACT_ADDRESS BTC_CONTRACT_ADDRESS; do
    VALUE=$(curl -s $CONTRACTS_HOST | jq -r .$KEY)
    echo "$KEY=$VALUE"
    export $KEY=$VALUE
done

if [[ "$1" != *int_* ]] ; then
  echo "Waiting until $ROLLUP_HOST is ready..."
  while ! curl -s $ROLLUP_HOST > /dev/null || [ "$(curl -s $ROLLUP_HOST | jq .isReady)" = "false" ]; do
      sleep 1
  done
fi

if [ -z "${DEBUG-}" ]; then
  export DEBUG="bb:e2e*"
fi

export NODE_NO_WARNINGS=1
node --openssl-legacy-provider --experimental-vm-modules $(yarn bin jest) --no-cache --runInBand $1