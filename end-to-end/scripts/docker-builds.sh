#!/bin/bash
set -e

# Move to root
cd ../../

cd ./barretenberg.js
echo "Building barretenberg.js"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg.js:latest .

cd ../blockchain
echo "Building blockchain"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/blockchain:latest .

cd ../sdk
echo "Building sdk"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest .

cd ../falafel
echo "Building falafel"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel:latest .

cd ../end-to-end
echo "Building end-to-end"
docker build -t 278380418400.dkr.ecr.eu-west-2.amazonaws.com/end-to-end:latest .