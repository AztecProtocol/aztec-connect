#!/bin/bash

bootstrap_macOS () {
    # Build WASM build
    brew list gnu-sed || brew install gnu-sed
    cd ./src
    curl -s -L https://github.com/CraneStation/wasi-sdk/releases/download/wasi-sdk-8/wasi-sdk-8.0-macos.tar.gz | tar zxfv - 
    sed -e $'213i\\\n#include "../../../../wasi/stdlib-hook.h"' -i.old ./wasi-sdk-8.0/share/wasi-sysroot/include/stdlib.h
}


bootstrap_linux () {
    # Build WASM build
    cd ./src
    curl -s -L https://github.com/CraneStation/wasi-sdk/releases/download/wasi-sdk-8/wasi-sdk-8.0-linux.tar.gz | tar zxfv - 
    sed -e '213i#include "../../../../wasi/stdlib-hook.h"' -i ./wasi-sdk-8.0/share/wasi-sysroot/include/stdlib.h 
}

cd ..
rm -rf ./**/node_modules/ ./*/yarn.lock
cd ./barretenberg

if [[ "$OSTYPE" == "darwin"* ]]; then
    bootstrap_macOS
elif [[ "$OSTYPE" == "linux-gnu" ]]; then
    bootstrap_linux
fi

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