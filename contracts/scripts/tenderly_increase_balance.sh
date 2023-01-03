#!/bin/bash

# inputs 
FORK_URL=$1

# Convert input 2 to hex
let BALANCE=10**$2
HEX=$( printf "%x" $BALANCE)

# Addresses should be a string of addresses
ADDRESSES=$3

# Create the payload to send to tenderly
generate_payload()
{
    cat <<EOF
{
    "method": "tenderly_setBalance",
    "params": [
        [$ADDRESSES],
        "0x$HEX"
    ]
}
EOF
}

echo $(generate_payload)

# Call the tenderly_setBalance cheat code for the provided address
curl -X POST $FORK_URL \
    -H "Content-Type: application/json" \
    -d "$(generate_payload)"