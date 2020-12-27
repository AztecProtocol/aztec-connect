#!/bin/bash
set -e
cd ../../../barretenberg/build
make -j$(nproc) tx_factory rollup_cli
rm -f pipe && mkfifo pipe
./src/aztec/rollup/tx_factory/tx_factory 1 1 ../../blockchain/test/fixtures/rollup_proof_data.dat < pipe | ./src/aztec/rollup/rollup_cli/rollup_cli 1 1 ../srs_db/ignition - > pipe