#!/bin/bash
set -e

pushd ../barretenberg/build
make -j$(nproc) rollup_cli
popd
yarn install
yarn link barretenberg
yarn build
cd dest && { yarn unlink 2> /dev/null || true; } && yarn link

# For some reason, if you're linked to halloumi from falafel, and any dir's are created in the data
# dir, falafel will restart. It's voodoo, I tried everything. This makes it very hard to test things
# so let's just create the directory structure here for the small sized rollups we support.
cd ..
mkdir -p data/crs
mkdir -p data/join_split
mkdir -p data/account
mkdir -p data/rollup_1/proving_key
mkdir -p data/root_rollup_1x{1,2,4}/proving_key