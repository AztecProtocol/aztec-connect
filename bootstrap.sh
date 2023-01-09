#!/bin/bash
set -e

export CLEAN=$1

# Remove all untracked files and directories.
if [ -n "$CLEAN" ]; then
  echo "WARNING: This will erase *all* untracked files, including hooks and submodules."
  echo -n "Continue? [y/n] "
  read user_input
  if [ "$user_input" != "y" ] && [ "$user_input" != "Y" ]; then
    exit 1
  fi
  rm .git/hooks/*
  git clean -fd
	for SUBMODULE in $(git config --file .gitmodules --get-regexp path | awk '{print $2}'); do
    rm -rf $SUBMODULE
  done
fi

git submodule update --init --recursive

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
  "barretenberg/cpp:./bootstrap.sh db_cli rollup_cli"
  "contracts:./bootstrap.sh"
  "yarn-project/barretenberg.js:./bootstrap.sh"
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
