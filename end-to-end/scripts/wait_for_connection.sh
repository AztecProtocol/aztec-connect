#!/bin/bash
set -e 

while ! nc -z ganache 8545
do
    echo sleeping
    sleep 1
done
echo Connected!