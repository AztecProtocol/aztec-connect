#!/bin/bash

# NOTE: deploy_e2e.sh must be run before running this script
# NOTE: This script will statically serve the deployed addresses on port so that it can be consumed by other service
# NOTE: making any HTTP request to SERVE_PORT will return the file.
echo "Serving contracts output on $SERVE_PORT"
socat -v -v TCP-LISTEN:$SERVE_PORT,crlf,reuseaddr,fork SYSTEM:"echo HTTP/1.0 200; echo Content-Type\: text/plain; echo; cat ./serve/contract_addresses.json"
