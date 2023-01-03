#!/bin/bash
set -euo pipefail

DATE=$(date +%Y%m%d)
TARGET_DIR=${1:-data-$DATE}
KILL_EXISTING_DB=${2:-}

# Get id of potentially existing postgres container.
CONTAINER_ID=$(docker ps | grep postgres | awk '{print $1}' || true)

if [ -n "$KILL_EXISTING_DB" -a -n "$CONTAINER_ID" ]; then
  # Kill any existing postgres container.
  echo "Stopping container: $CONTAINER_ID"
  docker stop $CONTAINER_ID
  CONTAINER_ID=
fi

echo "Target dir: $TARGET_DIR"
mkdir -p $TARGET_DIR

# Clone prod to target directory.
./scripts/clone_prod.sh $TARGET_DIR

# Start postgres container if one doesn't exist.
if [ -z "$CONTAINER_ID" ]; then
  echo "No postgres container found, starting..."
  CONTAINER_ID=$(docker run --rm -d -p 5432:5432 -e POSTGRES_USER=username -e POSTGRES_PASSWORD=password -e POSTGRES_DB=falafel postgres)
  # Wait to start...
  sleep 5
  # Import data dump.
  ./scripts/import_rds_db.sh $TARGET_DIR/db.dump
fi

# Override production environment variables such that we use local cloned sql db, etc.
export DATA_DIR=$TARGET_DIR
export DB_URL=${DB_URL:-postgres://username:password@localhost:5432}
export PRIVATE_KEY=
export PORT=${PORT:-8081}
export PROOF_GENERATOR_MODE=${PROOF_GENERATOR_MODE:-normal}

echo "Building..."
yarn build
yarn start