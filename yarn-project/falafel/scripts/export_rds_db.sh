#!/bin/bash
set -euo pipefail

DB_INSTANCE=$1
DB_PORT=${2:-5432}
DB_NAME=${3:-"falafel"}
TEMP_DIR=${4:-~/}

if [ $# -eq 0 ]; then
  echo "Please provide a db instance to export";
  exit
fi

# execute pg_dump on bastion via ssh
echo "Dumping db..."
PG_DUMP="pg_dump -h '${DB_INSTANCE}' --port ${DB_PORT} -U username -d ${DB_NAME} -Fc > db.dump"
ssh bastion "${PG_DUMP}"
echo "Dump completed, copying to mainframe at ${TEMP_DIR}..."

# pull the dump file across to mainframe
scp ec2-user@bastion:/home/ec2-user/db.dump $TEMP_DIR