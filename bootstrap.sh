#!/bin/bash

# CWD is ./barretenberg/

build_barretenberg_wasm() {
    cd ./barretenberg/src
    rm -rf wasi-sdk-8.0
    curl -s -L https://github.com/CraneStation/wasi-sdk/releases/download/wasi-sdk-8/wasi-sdk-8.0-$1.tar.gz | tar zxfv -
    sed -e $'213i\\\n#include "../../../../wasi/stdlib-hook.h"' -i.old ./wasi-sdk-8.0/share/wasi-sysroot/include/stdlib.h
    cd ..
    rm -rf build-wasm && mkdir build-wasm && cd build-wasm
    cmake -DWASM=ON ..
    cmake --build . --parallel --target barretenberg.wasm
    cd ../..
}

build_barretenberg() {
    cd ./barretenberg
    rm -rf ./build
    mkdir build
    cd build
    cmake ..
    make -j$(nproc)
    cd ../..
}

build_barretenberg_js() {
    cd ./barretenberg.js
    yarn install
    yarn build
    cd dest-es && yarn link
    cd ..
    cd dest && yarn link
    cd ..
    yarn symlink-wasm
    cd ..
}

build_hummus() {
    cd ./hummus
    yarn install
    yarn link barretenberg-es
    yarn build
    cd ..
}

build_tahini() {
    build_barretenberg
    cd ./tahini
    yarn install
    yarn link barretenberg-es
    yarn build
    cd ..
}

bootstrap () {
    rm -rf ./**/node_modules/ ./*/yarn.lock
    build_barretenberg_wasm $1
    build_barretenberg_js
    build_hummus
    build_tahini
}

if [[ "$OSTYPE" == "darwin"* ]]; then
    bootstrap macos
elif [[ "$OSTYPE" == "linux-gnu" ]]; then
    bootstrap linux
fi