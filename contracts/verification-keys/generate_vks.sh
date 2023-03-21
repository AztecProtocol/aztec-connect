#!/bin/bash
# Note this file assumes that it is being build as part of the wider aztec build system.
set -e

# It takes ages to compute the real 28x32, so let's leave it behind a flag and assume we'll do it manually.
PROD=$1

OUTPUT_DIR=../../contracts/src/core/verifier/keys

if [ -z "$PROD" ]; then
  cd ../../aztec-connect-cpp/ && mkdir -p build && cd build && cmake .. && cmake --build . --parallel --target keygen
  
  ./bin/keygen 1 1 $OUTPUT_DIR true 2> >(awk '$0="mock: "$0' 1>&2)
  ./bin/keygen 1 1 $OUTPUT_DIR 2> >(awk '$0="real1x1: "$0' 1>&2)
else
  cd ../../aztec-connect-cpp/barretenberg/cpp/srs_db && ./download_ignition.sh 10  
  cd ../../.. && mkdir -p build && cd build && cmake .. && cmake --build . --parallel --target keygen

  ./bin/keygen 28 32 $OUTPUT_DIR 2> >(awk '$0="real28x32: "$0' 1>&2)
fi
