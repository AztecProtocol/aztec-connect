#!/bin/sh
# Called before every test run. Will only create fixtures if they're missing.
set -e

if [ -f rollup_proof_data_1x2.dat ]; then
  exit 0;
fi

./create_proofs_dev.sh