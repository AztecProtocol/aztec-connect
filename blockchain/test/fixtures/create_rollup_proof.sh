#!/bin/bash
set -e
cd ../../../barretenberg/build
make -j$(nproc) tx_factory rollup_cli
./src/aztec/rollup/tx_factory/tx_factory 1 1 | ./src/aztec/rollup/rollup_cli/rollup_cli 1 ../srs_db/ignition - > ../../blockchain/test/fixtures/rollup_proof_data.dat