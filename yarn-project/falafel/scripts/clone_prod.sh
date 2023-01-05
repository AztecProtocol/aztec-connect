#!/bin/bash
set -euo pipefail

DATE=$(date +%Y%m%d)
TARGET_DIR=${1:-data-$DATE}
DB_INSTANCE='aztec-connect-prod-falafel-db.cmnjv3bf2jgu.eu-west-2.rds.amazonaws.com'

mkdir -p $TARGET_DIR

# Get prod sql db dump, if we don't already have it.
if [ ! -f "$TARGET_DIR/db.dump" ]; then
  ./scripts/export_rds_db.sh $DB_INSTANCE 5432 falafel $TARGET_DIR
else
  echo "$TARGET_DIR/db.dump already exists, skipping..."
fi

if [ ! -d "$TARGET_DIR/world_state.db" ]; then
  scp -r bastion:ac-prod-falafel-data/world_state.db $TARGET_DIR
else
  echo "$TARGET_DIR/world_state.db already exists, skipping..."
fi

if [ ! -f "$TARGET_DIR/config" ]; then
  scp bastion:ac-prod-falafel-data/config $TARGET_DIR
else
  echo "$TARGET_DIR/config already exists, skipping..."
fi
