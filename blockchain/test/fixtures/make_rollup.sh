#!/bin/bash
set -e
rm -rf ./rollup_proof_data.dat

# move into barretenberg/build
cd ../../../barretenberg/build

./src/aztec/rollup/tx_factory/tx_factory 1 1 | ./src/aztec/rollup/rollup_cli/rollup_cli 1 ../srs_db/ignition ./data > ../../blockchain/test/fixtures/rollup_proof_data.dat

