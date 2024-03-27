#!/bin/bash
set -eu

trap 'kill -9 $(jobs -p) > /dev/null 2>&1' EXIT

export PRIVATE_KEY=${PRIVATE_KEY:-}
export ETHEREUM_HOST=${ETHEREUM_HOST:-https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35}

export EXIT_ONLY=true
export MIN_CONFIRMATION=1
export MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW=1
export PERMIT_HELPER_CONTRACT_ADDRESS=0xf4F1e0B0b93b7b2b7b6992B99F2A1678b07Cd70C
export BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS=0x8b2e54fa4398c8f7502f30ac94cb1f354390c8ab
export PRICE_FEED_CONTRACT_ADDRESSES=0x169e633a2d1e6c10dd91238ba11c4a708dfef37c,0x773616E4d11A78F511299002da57A0a94577F1f4
# These are lies. The circuits have been changed to be 5x1.
# We need to pretend like we have the original topology as the system was not designed to change during network lifetime.
export NUM_OUTER_ROLLUP_PROOFS=32
export NUM_INNER_ROLLUP_TXS=28
export ROLLUP_CONTRACT_ADDRESS=0xFF1F2B4ADb9dF6FC8eAFecDcbF96A2B351680455
export NODE_ENV=production
export PROOF_GENERATOR_MODE=local

# Launch falafel in background.
(cd ../yarn-project/falafel && yarn start) &

# Wait until listening.
while ! nc -z localhost 8081; do
    sleep 1
done

# Wait until ready.
while [ "$(curl -s http://localhost:8081 | jq .isReady)" == "false" ]; do
    sleep 1
done

# Update runtime config.
curl -X PATCH http://localhost:8081/runtime-config -H "server-auth-token: !changeme#" -H "Content-Type: application/json" -d @<(cat <<EOF
{
  "publishInterval": 10,
  "flushAfterIdle": 5,
  "gasLimit": ${GAS_LIMIT:-2000000},
  "maxFeeGasPrice": 0,
  "feeGasPriceMultiplier": 0,
  "maxFeePerGas": ${MAX_FEE_PER_GAS:-100000000000},
  "maxPriorityFeePerGas": 2500000000
}
EOF
)

(cd ../zk-money && yarn serve ./dest) &

wait
