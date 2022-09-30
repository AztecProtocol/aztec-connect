#!/bin/sh
set -e

export ETHEREUM_HOST=http://localhost:8545
export ALLOW_PRIVILEGED_METHODS=true
export REDEPLOY=1

yarn clean_db
yarn build
yarn start