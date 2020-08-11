#!/bin/bash
set -e

cd /usr/src/blockchain/dest

yarn deploy:ganache

echo "Success, contracts deployed"
