#!/bin/bash
set -e

if [ ! -f ~/.nvm/nvm.sh ]; then
  echo "Nvm not found at ~/.nvm"
  exit 1
fi

\. ~/.nvm/nvm.sh
nvm install

# Until we push .yarn/cache, we still need to install.
cd yarn-project
yarn install --immutable
cd ..

# We only bootstrap projects that produce artefacts needed for running end-to-end tests and frontends.
# barretenberg outputs db_cli, rollup_cli and barretenberg.wasm.
# contracts outputs smart contract abis.
# barretenberg.js outputs a webpacked web worker.
# sdk produces a webpacked version needed by frontends.
PROJECTS=(
  "barretenberg:./bootstrap.sh db_cli rollup_cli"
  "contracts:./bootstrap.sh"
  "yarn-project/barretenberg.js:./bootstrap.sh"
  "yarn-project/blockchain:yarn build"
  "yarn-project/sdk:yarn build"
)

for E in "${PROJECTS[@]}"; do
  ARR=(${E//:/ })
  DIR=${ARR[0]}
  COMMAND=${ARR[@]:1}
  echo "Bootstrapping $DIR: $COMMAND"
  pushd $DIR > /dev/null
  $COMMAND
  popd > /dev/null
done


echo
echo "Success! You could now run e.g.: ./scripts/tmux-splits e2e_browser"
