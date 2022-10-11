#!/bin/bash
set -e

pushd  ../../barretenberg/build > /dev/null
make -j$(nproc) rollup_cli db_cli
cd  ../build-wasm
make -j$(nproc) barretenberg.wasm
popd

# Hosts
export ETHEREUM_HOST=http://localhost:8546

. ./scripts/export_addresses.sh
tsc-watch -p tsconfig.dest.json --onSuccess 'yarn start'