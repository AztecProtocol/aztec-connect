#!/bin/sh
set -e

export ETHEREUM_HOST=http://localhost:8544
export ALLOW_PRIVILEGED_METHODS=true
export ADDITIONAL_PERMITTED_METHODS=net_version
export REDEPLOY=1
export CONTRACTS_HOST=localhost
export CONTRACTS_PORT=8547

# Get the contract addresses from contracts container
. ./scripts/export_addresses.sh

yarn clean_db
yarn build
yarn start