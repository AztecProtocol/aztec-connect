#!/bin/bash
set -e

yarn clean
rm -rf node_modules

yarn install --frozen-lockfile
yarn build