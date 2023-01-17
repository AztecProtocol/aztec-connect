#!/bin/bash
# Source this file to define the PROJECTS variable.
# PROJECT elements have structure PROJECT:WORKING_DIR:DOCKERFILE:REPO.
#
# TODO: Generate this from build_manifest.json

# Commenting out a few projects, as the main use case is now to build the images needed to run end-to-end tests.
# If wanting to just see if docker images actually build, you can temporarily uncomment required projects.
PROJECTS=(
  barretenberg:barretenberg/cpp:./dockerfiles/Dockerfile.x86_64-linux-clang:barretenberg-x86_64-linux-clang
  barretenberg:barretenberg/cpp:./dockerfiles/Dockerfile.wasm-linux-clang:barretenberg-wasm-linux-clang
  blockchain-vks:blockchain-vks
  mainnet-fork:mainnet-fork
  contracts:contracts
  yarn-project-base:yarn-project
  barretenberg.js:yarn-project
  blockchain:yarn-project
  aztec-dev-cli:yarn-project
  halloumi:yarn-project
  falafel:yarn-project
  kebab:yarn-project
  # sdk:yarn-project
  hummus:yarn-project
  # wallet:yarn-project
  end-to-end:yarn-project
  # wasabi:yarn-project
  # zk-money:yarn-project
  # explorer:yarn-project
  # faucet:faucet
)
