#!/bin/bash
set -e

while ! nc -z falafel 8081; do
    sleep 1
done

while [ "$(curl -s localhost:8081 | jq .isReady)" == "false" ]; do
    sleep 1
done