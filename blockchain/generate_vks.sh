#!/bin/bash
set -e

# It takes ages to compute the real 28x32, so let's leave it behind a flag and assume we'll do it manually.
PROD=$1

cd ../barretenberg && mkdir -p build && cd build && cmake .. && make -j$(nproc) keygen

if [ -z "$PROD" ]; then
  # Let's assume we're on a 64 core machine. Performance doesn't improve over 32 cores, so let's pin processes
  # to cpus for optimal performance. The mock3x2 we can assume to be fast enough to ignore.
  ./bin/keygen 3 2 ../../blockchain/contracts/verifier/keys true 2> >(awk '$0="mock3x2: "$0' 1>&2) &
  taskset -c 0-31 ./bin/keygen 3 2 ../../blockchain/contracts/verifier/keys 2> >(awk '$0="real3x2: "$0' 1>&2) &
  taskset -c 32-63 ./bin/keygen 28 32 ../../blockchain/contracts/verifier/keys true 2> >(awk '$0="mock28x32: "$0' 1>&2) &
  wait -n
  wait -n
  wait -n
else
  ./bin/keygen 28 32 ../../blockchain/contracts/verifier/keys 2> >(awk '$0="real28x32: "$0' 1>&2)
fi

cd ../../blockchain
yarn compile