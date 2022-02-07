#!/bin/bash
# Assumes we have valid binaries at expected location.
# Builds a fixture (rollup proof) to input specification.
set -e

TXS=${1:-1}
DATA_DIR=${2:-./data}
INNER_SIZE=${3:-1}
OUTER_SIZE=${4:-1}
MOCK_PROOF=${5:-false}

[ "$MOCK_PROOF" = "true" ] && PREFIX="mock_"

cd ../../../../../barretenberg/build

# Ensure bidirectional pipe exists to feed request/response between tx_factory and rollup_cli.
rm -rf pipe && mkfifo pipe

./bin/tx_factory \
    $TXS $INNER_SIZE $OUTER_SIZE false $MOCK_PROOF \
    ../../blockchain/src/contracts/verifier/fixtures/${PREFIX}rollup_proof_data_${INNER_SIZE}x${OUTER_SIZE}.dat < pipe 2> >(awk '$0="tx_factory: "$0' 1>&2) |
    ./bin/rollup_cli ../srs_db/ignition $DATA_DIR $OUTER_SIZE false $MOCK_PROOF > pipe 2> >(awk '$0="rollup_cli: "$0' 1>&2)