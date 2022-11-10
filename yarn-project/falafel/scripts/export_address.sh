#!/bin/bash
set -e

ARG=$1
JSON_FIELD=$2

if [ -z "${!ARG}" -a -n "$ETHEREUM_HOST" ]; then
  echo "Waiting for $ETHEREUM_HOST..."
  [[ $ETHEREUM_HOST =~ https?://(.*):(.*) ]]
  while ! nc -z ${BASH_REMATCH[1]} ${BASH_REMATCH[2]}; do sleep 1; done;
  RESULT=$(curl -s $ETHEREUM_HOST)
  VALUE=$(echo $RESULT | jq -r ".redeployConfig.${JSON_FIELD}")
  echo "$ARG=$VALUE"
  export $ARG=$VALUE
fi