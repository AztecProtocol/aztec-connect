#!/bin/bash
set -e

TARGET_PROJECT=$1

if [ -z "$TARGET_PROJECT" ]; then
  TARGET_PROJECT=$(git rev-parse --show-prefix)
  if [ -n "$TARGET_PROJECT" ]; then
    TARGET_PROJECT=$(basename $TARGET_PROJECT)
    cd $(git rev-parse --show-cdup)
  fi
fi

ECR_URL=278380418400.dkr.ecr.eu-west-2.amazonaws.com

for E in barretenberg:./dockerfiles/Dockerfile.x86_64-linux-clang barretenberg:./dockerfiles/Dockerfile.wasm-linux-clang barretenberg.js blockchain-vks blockchain halloumi falafel sdk end-to-end; do
  ARR=(${E//:/ })
  PROJECT=${ARR[0]}
  DOCKERFILE=${ARR[1]:-./Dockerfile}
  cd $PROJECT
  echo
  echo
  echo
  echo "*** Building $PROJECT:$DOCKERFILE ***"
  if [ "$PROJECT" = "$TARGET_PROJECT" ]; then
    time docker build --no-cache -f $DOCKERFILE -t $ECR_URL/$PROJECT:latest .
    break
  else
    time docker build -f $DOCKERFILE -t $ECR_URL/$PROJECT:latest .
  fi
  cd ..
done