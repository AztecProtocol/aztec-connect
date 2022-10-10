#!/bin/bash
set -e

MOCK_PROOF=$1
CONDITIONAL=$2

if [ -n "$CONDITIONAL" -a -f mock_rollup_proof_data_3x2.dat ]; then
  exit 0;
fi

cd ../../../../../../barretenberg
if [ -d "./src" ]; then
  mkdir -p build && cd build && rm -rf ./data && cmake .. && make -j$(nproc) tx_factory rollup_cli && cd ..
fi
cd srs_db && ./download_ignition.sh 0
cd ../../yarn-project/blockchain/src/contracts/verifier/fixtures

# input format: num_txs | inner size | outer size
./create_rollup_proof.sh 4 3 2 $MOCK_PROOF
