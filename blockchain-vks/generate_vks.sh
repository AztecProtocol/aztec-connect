#!/bin/bash
set -e

OUTPUT_DIR=../../blockchain-vks/keys

cd ../barretenberg/srs_db
./download_ignition.sh 1

cd ../build

mkdir -p $OUTPUT_DIR

./bin/keygen 1 1 $OUTPUT_DIR true 2> >(awk '$0="mock: "$0' 1>&2)
./bin/keygen 1 1 $OUTPUT_DIR 2> >(awk '$0="real1x1: "$0' 1>&2)