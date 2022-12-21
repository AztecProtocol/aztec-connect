#!/bin/bash

# Increase the balance of critical accounts after testnet deployment
ETHEREUM_HOST=$1
PRIVATE_KEY=$2

# Let balance be 10^(input) wei to send
let BALANCE=10**$3

# The accounts to fund (as an array)
ACCOUNTS=$4

for ACCOUNT in "${ACCOUNTS[@]}"; do
    echo "Funding account $ACCOUNT with $BALANCE wei"
    cast send --value $BALANCE --private-key $PRIVATE_KEY $ACCOUNT
done