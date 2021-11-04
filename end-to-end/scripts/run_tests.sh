#!/bin/bash
set -e

COMMIT_HASH=$1
export TEST=$2

$(aws ecr get-login --region us-east-2 --no-include-email) 2> /dev/null

docker pull 278380418400.dkr.ecr.us-east-2.amazonaws.com/falafel:cache-$COMMIT_HASH
docker pull 278380418400.dkr.ecr.us-east-2.amazonaws.com/halloumi:cache-$COMMIT_HASH
docker pull 278380418400.dkr.ecr.us-east-2.amazonaws.com/end-to-end:cache-$COMMIT_HASH

docker tag 278380418400.dkr.ecr.us-east-2.amazonaws.com/falafel:cache-$COMMIT_HASH 278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel:latest
docker tag 278380418400.dkr.ecr.us-east-2.amazonaws.com/halloumi:cache-$COMMIT_HASH 278380418400.dkr.ecr.eu-west-2.amazonaws.com/halloumi:latest
docker tag 278380418400.dkr.ecr.us-east-2.amazonaws.com/end-to-end:cache-$COMMIT_HASH 278380418400.dkr.ecr.eu-west-2.amazonaws.com/end-to-end:latest

docker-compose up --exit-code-from end-to-end