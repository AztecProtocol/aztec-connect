#!/bin/bash
set -e

TARGET_PROJECT=$1
PUSH_LABEL=$2

if [ -z "$TARGET_PROJECT" ]; then
  TARGET_PROJECT=$(git rev-parse --show-prefix)
  if [ -n "$TARGET_PROJECT" ]; then
    TARGET_PROJECT=$(basename $TARGET_PROJECT)
    cd $(git rev-parse --show-cdup)
  fi
fi

ECR_URL=278380418400.dkr.ecr.eu-west-2.amazonaws.com

PROJECTS=(
  barretenberg:./dockerfiles/Dockerfile.x86_64-linux-clang:barretenberg-x86_64-linux-clang
  barretenberg:./dockerfiles/Dockerfile.wasm-linux-clang:barretenberg-wasm-linux-clang
  barretenberg.js
  blockchain-vks
  blockchain
  halloumi
  falafel
  sdk
  end-to-end
  wasabi
  zk-money
)

for E in ${PROJECTS[@]}; do
  ARR=(${E//:/ })
  PROJECT=${ARR[0]}
  DOCKERFILE=${ARR[1]:-./Dockerfile}
  REPO=${ARR[2]:-$PROJECT}
  cd $PROJECT
  echo
  echo
  echo
  echo "*** Building $PROJECT:$DOCKERFILE -> $REPO ***"
  echo
  if [ "$PROJECT" = "$TARGET_PROJECT" ]; then
    time docker build --no-cache -f $DOCKERFILE -t $ECR_URL/$REPO:latest .
    if [ -n "$PUSH_LABEL" ]; then
      $(aws ecr get-login --region eu-west-2 --no-include-email) 2> /dev/null
      docker tag $ECR_URL/$REPO:latest $ECR_URL/$REPO:$PUSH_LABEL
      docker push $ECR_URL/$REPO:$PUSH_LABEL
    fi
    break
  else
    time docker build -f $DOCKERFILE -t $ECR_URL/$REPO:latest .
  fi
  cd ..
done
