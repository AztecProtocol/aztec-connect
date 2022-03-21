#!/bin/bash
set -e

for DIR in barretenberg barretenberg.js blockchain falafel sdk; do
  echo "Bootstrapping $DIR..."
  cd $DIR
  [ -f ./bootstrap.sh ] && ./bootstrap.sh
  cd ..
done

echo
echo Success!
