#!/bin/sh
set -e

cd  ../barretenberg/build
make -j$(nproc) rollup_cli db_cli
cd  ../build-wasm
make -j$(nproc) barretenberg.wasm
cd ../../falafel

# Hosts
export ETHEREUM_HOST=http://localhost:8545

. ./export_addresses.sh
tsc-watch -p tsconfig.dest.json --onSuccess 'yarn start'