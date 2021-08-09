#!/bin/bash
set -e
cd ../../../../barretenberg/build
make -j$(nproc) tx_factory rollup_cli
rm -f pipe && mkfifo pipe
TXS=${1:-1}
INNER_SIZE=${2:-1}
OUTER_SIZE=${3:-1}
DATA_DIR=${4:-./data}
./src/aztec/rollup/tx_factory/tx_factory $TXS $INNER_SIZE $OUTER_SIZE ../../blockchain/test/verifier/fixtures/rollup_proof_data_${INNER_SIZE}x${OUTER_SIZE}.dat < pipe | ./src/aztec/rollup/rollup_cli/rollup_cli ../srs_db/ignition $DATA_DIR > pipe