#!/bin/bash
set -e

# It takes ages to compute the real 28x32, so let's leave it behind a flag and assume we'll do it manually.
PROD=$1

cd ../barretenberg && mkdir -p build && cd build && cmake .. && make -j$(nproc) keygen

if [ -z "$PROD" ]; then
  ./bin/keygen 1 1 ../../blockchain/contracts/verifier/keys true 2> >(awk '$0="mock: "$0' 1>&2)
  ./bin/keygen 1 1 ../../blockchain/contracts/verifier/keys 2> >(awk '$0="real1x1: "$0' 1>&2)
else
  ./bin/keygen 28 32 ../../blockchain/contracts/verifier/keys 2> >(awk '$0="real28x32: "$0' 1>&2)
fi

cd ../../blockchain
yarn compile