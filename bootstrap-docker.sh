#!/bin/bash
set -e

ECR_URL=278380418400.dkr.ecr.eu-west-2.amazonaws.com

cd ./barretenberg
echo "Building barretenberg"
docker build --file ./dockerfiles/Dockerfile.x86_64-linux-clang . -t $ECR_URL/barretenberg:x86_64-linux-clang

echo "Building barretenberg wasm"
docker build --file ./dockerfiles/Dockerfile.wasm-linux-clang . -t $ECR_URL/barretenberg:wasm-linux-clang

cd ../barretenberg.js
echo "Building barretenberg.js"
docker build -t $ECR_URL/barretenberg.js:latest .

cd ../blockchain
echo "Building blockchain"
docker build -t $ECR_URL/blockchain:latest .

cd ../sriracha
echo "Building sriracha"
docker build -t $ECR_URL/sriracha:latest .

cd ../sdk
echo "Building sdk"
docker build -t $ECR_URL/sdk:latest .

cd ../falafel
echo "Building falafel"
docker build -t $ECR_URL/falafel:latest .

cd ../end-to-end
echo "Building end-to-end"
docker build -t $ECR_URL/end-to-end:latest .
