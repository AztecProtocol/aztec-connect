#!/bin/sh
set -e

export ETHEREUM_HOST=http://localhost:8544
export ALLOW_PRIVILEGED_METHODS=true
export ADDITIONAL_PERMITTED_METHODS=net_version
export REDEPLOY=1
export VK=VerificationKey1x1

yarn clean_db
yarn build
yarn start