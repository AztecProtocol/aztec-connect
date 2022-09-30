#!/bin/sh
set -e

export ETHEREUM_HOST=http://localhost:8545
export ALLOW_PRIVILEGED_METHODS=true

yarn clean_db
yarn build
mkdir -p ../.env/
`yarn -s deploy_rollup_processor > ../.env/env-vars`
. ../.env/env-vars
yarn start