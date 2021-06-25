#!/bin/bash
set -e

ECR_URL=278380418400.dkr.ecr.eu-west-2.amazonaws.com

cd ./barretenberg
echo "Building barretenberg"
docker build --file ./dockerfiles/Dockerfile.x86_64-linux-clang . -t $ECR_URL/barretenberg-x86_64-linux-clang

echo "Building barretenberg wasm"
docker build --file ./dockerfiles/Dockerfile.wasm-linux-clang . -t $ECR_URL/barretenberg-wasm-linux-clang

for PROJECT in barretenberg.js blockchain sriracha halloumi falafel sriracha sdk end-to-end; do
  cd ../$PROJECT
  echo "Building $PROJECT"
  docker build -t $ECR_URL/$PROJECT:latest .
done