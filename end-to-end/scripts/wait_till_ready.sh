#!/bin/bash
set -e

HOST=${1:-falafel}

while ! nc -z $HOST 8081; do
    sleep 1
done

while [ "$(curl -s $HOST:8081 | jq .isReady)" == "false" ]; do
    sleep 1
done