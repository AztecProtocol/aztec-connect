#!/bin/bash

# CWD is ./barretenberg/hummus
cd ..
rm -rf ./**/node_modules/ ./*/yarn.lock
cd ./barretenberg

WASI_SDK_URL=$1
WASI_SDK_PATH=$2

if [[ -z $1 ]]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        WASI_SDK_URL="https://github.com/CraneStation/wasi-sdk/releases/download/wasi-sdk-8/wasi-sdk-8.0-macos.tar.gz"
    elif [[ "$OSTYPE" == "linux-gnu" ]]; then
        WASI_SDK_URL="https://github.com/CraneStation/wasi-sdk/releases/download/wasi-sdk-8/wasi-sdk-8.0-linux.tar.gz"
    fi
fi

if [[ -z $2 ]]; then
    WASI_SDK_PATH="./wasi-sdk-8.0/share/wasi-sysroot/include/stdlib.h"
fi

# Build WASM build
cd ./src
curl -s -L $WASI_SDK_URL | tar zxfv - 
sed -e $'213i\\\n#include "../../../../wasi/stdlib-hook.h"' -i.old $WASI_SDK_PATH

cd ..
rm -rf build-wasm && mkdir build-wasm && cd build-wasm
cmake -DWASM=ON ..
make -j16 barretenberg.wasm

cd ../../barretenberg.js
yarn install
yarn build
cd dest-es && yarn link
cd ..
yarn symlink-wasm
cd ../hummus

yarn install
yarn link barretenberg-es
yarn build
cd ../hummus