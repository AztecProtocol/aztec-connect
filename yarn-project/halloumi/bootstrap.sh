#!/bin/bash
set -e

pushd ../../barretenberg/cpp/build
make -j$(nproc) rollup_cli
popd

yarn build