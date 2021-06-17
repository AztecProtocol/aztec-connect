#!/bin/bash
set -e

for DIR in barretenberg barretenberg.js blockchain halloumi falafel sriracha sdk end-to-end hummus zk.money; do
  echo "Bootstrapping $DIR..."
  cd $DIR
  [ -f ./bootstrap.sh ] && ./bootstrap.sh > /dev/null
  cd ..
done

echo
echo Success!