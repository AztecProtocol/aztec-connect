#!/bin/sh

ENV=$1
TEMP_DIR=${2:-~/}
if [ $# -eq 0 ]; then
  echo "Please provide an environment to export";
  exit
fi
echo "Exporting world state from $ENV to ${TEMP_DIR}..."
# pull the world state across to mainframe
mkdir $TEMP_DIR
scp -r ec2-user@bastion:/home/ec2-user/ac-$ENV-falafel-data/world_state.db $TEMP_DIR