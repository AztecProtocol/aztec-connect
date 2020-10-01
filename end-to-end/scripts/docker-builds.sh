#!/bin/bash
set -e

# Move to root
cd ../../

cd ./barretenberg
echo "Building barretenberg"
docker build --file ./dockerfiles/Dockerfile.x86_64-linux-clang . -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg:x86_64-linux-clang

echo "Building barretenberg wasm"
docker build --file ./dockerfiles/Dockerfile.wasm-linux-clang . -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg:wasm-linux-clang

cd ../barretenberg.js
echo "Building barretenberg.js"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest .

cd ../blockchain
echo "Building blockchain"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain:latest .

cd ../sriracha
echo "Building sriracha"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sriracha:latest .

cd ../sdk
echo "Building sdk"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest .

cd ../falafel
echo "Building falafel"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel:latest .

cd ../end-to-end
echo "Building end-to-end"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/end-to-end:latest .
