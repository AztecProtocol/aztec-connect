#!/bin/sh
set -eu pipefail

ROLLUP_HOST=${ROLLUP_HOST:-http://localhost:8081}

echo $ROLLUP_HOST > /usr/src/sdk/dest/ROLLUP_PROVIDER_URL;
yarn start