#!/bin/bash
set -e

cmake --build ../../aztec-connect-cpp/build --parallel --target rollup_cli

yarn build