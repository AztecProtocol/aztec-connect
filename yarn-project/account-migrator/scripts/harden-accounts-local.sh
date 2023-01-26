#!/bin/bash

# This script is used to launch a full test of the account hardener.
# This is NOT to be used for tests on a live/external network.
# The steps performed by this script include:
#   * Launch anvil, kebab, halloumi (twice), and falafel
#     * Wait for all subprocesses so that the user can Ctrl-z / background
#       * Also so that child processes do not keep running after script exits
#       * If any of the required subprocesses fail, kills all of them
#     * Wait for these services to be ready
#   * Run all stages of the hardener (createHardener, genRollupProofs, hardenAccounts, and verifyHardened)
#
# Examples
#
# Full test:
# ```
# ./scripts/harden-accounts-local.sh
# ```
#
# WARNING: this script is for fully LOCAL tests only! Not meant for use with testnet or mainnet

LOG_DIR="$(readlink -f $(dirname -- "$(readlink -f "${BASH_SOURCE}")")/../log)"
mkdir -p $LOG_DIR
echo "All logs are in '$LOG_DIR'"
echo "Cleaning old logs"
rm $LOG_DIR/*

# Helper function to recursively kill all descendants of a process
function kill_descendant_processes() {
  # adapted from https://stackoverflow.com/questions/2618403/how-to-kill-all-subprocesses-of-shell
  # without -9 in kill
  local pid="$1"
  local and_self="${2:-false}"
  if children="$(pgrep -P "$pid")"; then
      for child in $children; do
          kill_descendant_processes "$child" true
      done
  fi
  if [[ "$and_self" == true ]]; then
      kill "$pid"
  fi
}

# Helper function to kill ALL of this process' children/descendants recursively
# and exit with nonzero status
function die() {
  echo
  echo "!!!!! FAILURE !!!!!"
  if [ -n "$1" ]; then
    echo "$1"
  fi
  echo "Killing all child processes and exiting."
  kill_descendant_processes $$
  exit 1
}

# Wait until a log file shows a certain line, then proceed
# $1: process name
# $2: log file
# $3: string to check for
# $4: number of processes that should be running in the meantime (otherwise some process failed -> kill all)
function wait_until_log_ready() {
  # Loop/sleep here until kebab is ready (check its log file for the keyline below)
  echo "Watching $1 log file to wait until it is ready to proceed ($2)"
  while ! grep "$3" $2 > /dev/null 2>&1; do
    # Make sure all background processes are still running (e.g. maybe anvil, kebab, 2 halloumis, falafel...)
    if [[ "$(jobs -r | wc -l)" != $4 ]]; then
      jobs -l
      echo "Only $(jobs -r | wc -l) of the expected $4 processes are still running"
      die "Failure in anvil, kebab, halloumi or falafel. Check logs: $LOG_DIR/*.log"
    fi
    sleep 2  # wait a bit and check again whether process is ready
    echo -n "."
  done
  echo
}

echo
echo "********************************************"
echo "          Running harden test"
echo "********************************************"

ANVIL_LOG=$LOG_DIR/anvil-local-setup.log
KEBAB_LOG=$LOG_DIR/kebab-local-setup.log
FALAFEL_LOG=$LOG_DIR/falafel-local-setup.log

# kebab options
export ALLOW_PRIVILEGED_METHODS=true
export ADDITIONAL_PERMITTED_METHODS=net_version
export REDEPLOY=1

# halloumi options
export NUM_INNER_ROLLUP_TXS=3
export NUM_OUTER_ROLLUP_PROOFS=2
export PERSIST=false
export PROVERLESS=true

# These following applications need to be run for a fully LOCAL test
echo "Running local anvil instance. Output in '$ANVIL_LOG'"
(cd ../../contracts && ./scripts/start_e2e.sh  > $ANVIL_LOG 2>&1) &
# wait for anvil to start up before proceeding
wait_until_log_ready anvil $ANVIL_LOG "Serving contracts output" 1

echo "Running local kebab instance . Output in '$KEBAB_LOG'"
(cd ../kebab && ETHEREUM_HOST=http://localhost:8544 yarn start:e2e > $KEBAB_LOG 2>&1) &
# wait for kebab to start up before proceeding
wait_until_log_ready kebab $KEBAB_LOG "Server: Server started, indexing:" 2

echo "Running the halloumi instance to communicate with falafel and generate rollup blocks. Output in '$LOG_DIR/halloumi-local-setup.log'"
(cd ../halloumi && DEBUG=bb:* yarn start > $LOG_DIR/halloumi-local-setup.log 2>&1) &
# don't need to wait for halloumi to be ready

echo "Running the falafel instance to populate anvil with rollup blocks. Output in '$FALAFEL_LOG'"
(cd ../falafel && ETHEREUM_HOST=http://localhost:8545 DEBUG=bb:* yarn start:e2e > $FALAFEL_LOG 2>&1) &
# wait for falafel to start up before proceeding
wait_until_log_ready falafel $FALAFEL_LOG "Server: Ready to receive txs." 4

# This instance of halloumi is necessary in ALL circumstances for the account hardener
echo "Running the halloumi instance to communicate with the account hardener. Output in '$LOG_DIR/halloumi-hardener-test.log'"
(cd ../halloumi && DEBUG=bb:* PORT=9083 JOB_SERVER_URL="http://localhost:9082" yarn start > $LOG_DIR/halloumi-hardener-test.log 2>&1) &
# don't need to wait for halloumi to be ready

# Grep falafel log for rollup contract address
rollupAddress=$(sed -n -e 's/^.*Rollup contract address: \(0x[a-fA-F0-9]\+\)/\1/p' $FALAFEL_LOG)
echo "Falafel is ready and rollup contract lives at address: ${rollupAddress}"

# NOTE: `-t 99999` below is just an arbitrarily large rollup block ID so that we make sure we harden accounts in ALL blocks
# Usage string to print to screen
USAGE=$(cat <<EOF
  # Execute full sequence of hardener commands and verify
  DEBUG=am:* yarn start harden fullSequence -a "${rollupAddress}" --port 9082 -m true -c 0
  DEBUG=am:* yarn start harden verifyHardened  -a "${rollupAddress}" --port 9082 -m true -c 0
  # Alternatively execute step-by-step
  DEBUG=am:* yarn start harden createHardener  -a "${rollupAddress}" --port 9082 -m true -c 0
  DEBUG=am:* yarn start harden genHardenProofs -a "${rollupAddress}" --port 9082 -m true -c 0
  DEBUG=am:* yarn start harden hardenAccounts  -a "${rollupAddress}" --port 9082 -m true -c 0
  DEBUG=am:* yarn start harden verifyHardened  -a "${rollupAddress}" --port 9082 -m true -c 0
EOF
)

{
  # Run all hardener steps
  echo "Building account migrator and starting harden test..."
  echo "If this command fails, the program will NOT exit!"
  echo "You can keep all of your progress by backgrounding this process with Ctrl-z followed by 'bg', then just rerun one of the following commands:"
  echo "$USAGE"
  # Execute full sequence of hardener commands and then verify
  #yarn build && \
  #DEBUG=am:* yarn -s start harden fullSequence -a "${rollupAddress}" --port 9082 -m true -c 0 && \
  #DEBUG=am:* yarn start harden verifyHardened  -a "${rollupAddress}" --port 9082 -m true -c 0
  # Alternatively execute step-by-step
  yarn build && \
  DEBUG=am:* yarn start harden createHardener  -a "${rollupAddress}" --port 9082 -m true -c 0 && \
  DEBUG=am:* yarn start harden genHardenProofs -a "${rollupAddress}" --port 9082 -m true -c 0 && \
  DEBUG=am:* yarn start harden hardenAccounts  -a "${rollupAddress}" --port 9082 -m true -c 0 && \
  DEBUG=am:* yarn start harden verifyHardened  -a "${rollupAddress}" --port 9082 -m true -c 0
} || {
  # Don't kill the program here in case user wants to rerun one of the harden commands while this remains in bg
  echo "Failure in harden test. Keeping anvil, halloumi, and falafel running..."
  echo "To only rerun the account-migrator's harden functions, Ctrl-z then run 'bg' followed by one of the following commands:"
  echo "$USAGE"
}

echo "Done with harden test. Ctrl-c to quit anvil, halloumi and falafel."
echo

# The `wait` command below ensures that all backgrounded processes (anvil, halloumis, falafel)
# must exit before this script exits
wait
