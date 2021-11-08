#!/bin/bash
set -e

for DIR in barretenberg barretenberg.js blockchain halloumi falafel sdk end-to-end hummus zk-money account-migrator; do
  echo "Bootstrapping $DIR..."
  cd $DIR
  [ -f ./bootstrap.sh ] && ./bootstrap.sh
  cd ..
done

echo
echo Success!
