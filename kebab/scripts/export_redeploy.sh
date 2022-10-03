#!/bin/bash
set -e

if [ -z "$BASH_ENV" ]; then
  BASH_ENV=$(mktemp)
fi

# increment this value to force a contract redployemt
REDEPLOY=2

echo export TF_VAR_REDEPLOY=$REDEPLOY >> $BASH_ENV
cat $BASH_ENV

# Having written the variables to $BASH_ENV, we now want to set them in this shell context.
source $BASH_ENV