#!/bin/bash
set -e

COMMIT_HASH=$1
TEST=$2
SSH_OPTIONS="-i buildkey -o StrictHostKeyChecking=no -o User=ubuntu"

# Ensure ssh key permissions are not too open.
chmod 600 buildkey

# Get spot instance.
IP=$(./request_spot.sh $COMMIT_HASH:$TEST)

# Wait till ssh port is open.
echo "Waiting for SSH at $IP..."
while ! nc -z $IP 22; do sleep 1; done;

# Run tests remotely on spot instance, capturing success or failure.
set +e
./remote_run_tests.sh $IP $COMMIT_HASH $TEST
CODE=$?

# Shutdown spot.
echo "Terminating spot instance..."
ssh $SSH_OPTIONS $IP sudo halt -p > /dev/null 2>&1

exit $CODE