#!/bin/bash
# In the event of circuits being changed, certain parts of the project need to be rebuilt. This script:
# Erases any old fixtures. They'll be regenerated next time tests are run.
# Recomputes the blockchain verification key smart contract.

cd barretenberg/build
rm -rf ../src/aztec/rollup/proofs/root_rollup/fixtures
rm -rf ../src/aztec/rollup/proofs/root_verifier/fixtures
cd ../../blockchain
rm ./src/contracts/verifier/fixtures/*.dat
./generate_vks_dev.sh
