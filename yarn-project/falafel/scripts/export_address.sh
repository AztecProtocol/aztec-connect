#!/bin/bash
set -e

ARG=$1
JSON_FIELD=$2

if [ -z "${!ARG}" -a -n "$ETHEREUM_HOST" ]; then
  echo "Waiting for $ETHEREUM_HOST..."
  [[ $ETHEREUM_HOST =~ http(s?)://(.*):([0-9]*)/?(.*) ]]
  while ! nc -z ${BASH_REMATCH[2]} ${BASH_REMATCH[3]}; do sleep 1; done;
  BASE_HOST=http${BASH_REMATCH[1]}://${BASH_REMATCH[2]}:${BASH_REMATCH[3]}
  RESULT=$(curl -s $BASE_HOST)
  VALUE=$(echo $RESULT | jq -r ".redeployConfig.${JSON_FIELD}")
  echo "$ARG=$VALUE"
  export $ARG=$VALUE
fi