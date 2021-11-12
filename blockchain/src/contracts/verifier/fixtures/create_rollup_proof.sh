#!/bin/bash
set -e
cd ../../../../../barretenberg/build-vks
make -j$(nproc) tx_factory rollup_cli
rm -f pipe && mkfifo pipe

TXS=${1:-1}
SPLIT_PROOFS_ACROSS_ROLLUPS=${2:0}
DATA_DIR=${3:-./data}
INNER_SIZE=${4:-1}
OUTER_SIZE=${5:-1}
VALID_OUTERS=${6:-1}

./src/aztec/rollup/tx_factory/tx_factory \
    $TXS $INNER_SIZE $OUTER_SIZE $SPLIT_PROOFS_ACROSS_ROLLUPS \
    ../../blockchain/src/contracts/verifier/fixtures/rollup_proof_data_${INNER_SIZE}x${OUTER_SIZE}.dat < pipe |
    ./src/aztec/rollup/rollup_cli/rollup_cli ../srs_db/ignition $DATA_DIR $VALID_OUTERS  > pipe