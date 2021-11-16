#!/bin/bash
# In the event of circuits being changed, certain parts of the project need to be rebuilt. This script:
# Erases any fixtures directories that may contain old fixtures. They'll be regenerated next time tests are run.
# Recomputes the blockchain verification key smart contract, and test proofs.

cd barretenberg/build
rm -rf ../src/aztec/rollup/proofs/root_rollup/fixtures
rm -rf ../src/aztec/rollup/proofs/root_verifier/fixtures
cd ../../blockchain
yarn generate:dev
