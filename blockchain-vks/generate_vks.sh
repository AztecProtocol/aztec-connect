#!/bin/bash
set -e

OUTPUT_DIR=../../blockchain-vks/keys

cd ../barretenberg/srs_db
./download_ignition.sh 1

cd ../build

mkdir -p $OUTPUT_DIR

# Let's assume we're on a 64 core machine. Performance doesn't improve over 32 cores, so let's pin processes
# to cpus for optimal performance. The mock3x2 we can assume to be fast enough to ignore.
./bin/keygen 3 2 $OUTPUT_DIR true 2> >(awk '$0="mock3x2: "$0' 1>&2) &
taskset -c 0-31 ./bin/keygen 3 2 $OUTPUT_DIR 2> >(awk '$0="real3x2: "$0' 1>&2) &
taskset -c 32-63 ./bin/keygen 28 32 $OUTPUT_DIR true 2> >(awk '$0="mock28x32: "$0' 1>&2) &
wait -n
wait -n
wait -n