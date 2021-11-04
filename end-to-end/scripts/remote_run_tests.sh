#!/bin/bash
set -e

IP=$1
COMMIT_HASH=$2
TEST=$3
SSH_OPTIONS="-i buildkey -o StrictHostKeyChecking=no -o User=ubuntu"

# Ensure ssh key permissions are not too open.
chmod 600 buildkey

# Copy required files to spot instance.
scp $SSH_OPTIONS ../docker-compose.yml $IP:.
scp $SSH_OPTIONS ./run_tests.sh $IP:.

# Run tests on remote instance.
ssh $SSH_OPTIONS $IP ./run_tests.sh $COMMIT_HASH $TEST