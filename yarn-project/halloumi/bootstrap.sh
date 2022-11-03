#!/bin/bash
set -e

pushd ../../barretenberg/build
make -j$(nproc) rollup_cli
popd

yarn build