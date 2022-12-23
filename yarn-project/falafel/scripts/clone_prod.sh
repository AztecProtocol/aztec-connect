#!/bin/bash
set -euox pipefail

DATE=$(date +%Y%m%d)
TARGET_DIR=${1:-data-$DATE}
DB_INSTANCE='aztec-connect-prod-falafel-db.cmnjv3bf2jgu.eu-west-2.rds.amazonaws.com'

# Kill any existing postgres container.
CONTAINER_ID=$(docker ps | grep postgres | awk '{print $1}' || true)
[ -z "$CONTAINER_ID" ] || docker stop $CONTAINER_ID

echo "Target dir: $TARGET_DIR"
mkdir -p $TARGET_DIR

# Get prod sql db dump, if we don't already have it.
if [ ! -f "$TARGET_DIR/db.dump" ]; then
  ./scripts/export_rds_db.sh $DB_INSTANCE 5432 falafel $TARGET_DIR
fi

# Start postgres container.
CONTAINER_ID=$(docker run --rm -d -p 5432:5432 -e POSTGRES_USER=username -e POSTGRES_PASSWORD=password -e POSTGRES_DB=falafel postgres)

# Wait to start...
sleep 5

./scripts/import_rds_db.sh $TARGET_DIR/db.dump
