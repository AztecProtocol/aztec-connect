#!/bin/bash
set -e
cd ../../../../../barretenberg/build
make -j$(nproc) standard_plonk_proofkeygen
./src/aztec/rollup/standard_plonk_proofkeygen/standard_plonk_proofkeygen 0 1> ./standard_proof_data.dat
mv standard_proof_data.dat ../../blockchain/src/contracts/verifier/fixtures/standard_proof_data.dat