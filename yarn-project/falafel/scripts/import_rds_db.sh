#!/bin/sh

DUMP_FILE=$1
DB_NAME=${2:-"falafel"}
DOCKER_VOLUME=${3:-"/var/lib/postgresql/data"}

if [ $# -eq 0 ]; then
  echo "Please provide a dump file to import";
  exit
fi

echo "This script defaults to using a docker volume at /var/lib/postgresql/data. If you think this is wrong then pass your actual volume via the 3rd argument"
echo "You can find your docker volumes by looking at the 'Destination' key after running command 'docker inspect -f '{{ json .Mounts }}' <CONTAINER_ID> | python -m json.tool'"

echo "Importing $DUMP_FILE to docker..."
CONTAINER_ID=$(docker ps | grep postgres | awk '{print $1}')
# copy dump into container
docker cp $DUMP_FILE $CONTAINER_ID:$DOCKER_VOLUME/db.dump

# shell into container and perform the restore
echo "Restoring db from dump file..."
docker exec -it $CONTAINER_ID bash -c "pg_restore --no-owner --no-privileges -U username -d $DB_NAME $DOCKER_VOLUME/db.dump"
echo "Completed"