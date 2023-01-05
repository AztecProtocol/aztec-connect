#! /bin/sh
set -eu

ROLLUP_HOST=${ROLLUP_HOST:-http://localhost:8081}

echo "Waiting until $ROLLUP_HOST is ready..."
while ! curl -s $ROLLUP_HOST > /dev/null || [ "$(curl -s $ROLLUP_HOST | jq .isReady)" = "false" ]; do
    sleep 1
done

echo "Posting bridge runtime config..."
curl -s -X PATCH $ROLLUP_HOST/runtime-config -H "Content-Type: application/json" -H "server-auth-token: !changeme#" -d @./scripts/test_bridge_configs.json > /dev/null

if [ -z "${DEBUG-}" ]; then
  export DEBUG="bb:e2e*"
fi

export NODE_NO_WARNINGS=1
node --openssl-legacy-provider --experimental-vm-modules $(yarn bin jest) --no-cache --runInBand $1