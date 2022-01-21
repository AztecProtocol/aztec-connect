#!/bin/sh
# Assumes we have valid binaries at expected location.
# Builds a fixture (rollup proof) to input specification.
set -e

TXS=${1:-1}
DATA_DIR=${2:-./data}
INNER_SIZE=${3:-1}
OUTER_SIZE=${4:-1}
VALID_OUTERS=${5:-$OUTER_SIZE}

cd ../../../../../barretenberg/build

# Ensure bidirectional pipe exists to feed request/response between tx_factory and rollup_cli.
rm -rf pipe && mkfifo pipe

./bin/tx_factory \
    $TXS $INNER_SIZE $OUTER_SIZE 0 \
    ../../blockchain/src/contracts/verifier/fixtures/rollup_proof_data_${INNER_SIZE}x${OUTER_SIZE}.dat < pipe |
    ./bin/rollup_cli ../srs_db/ignition $DATA_DIR $VALID_OUTERS false > pipe