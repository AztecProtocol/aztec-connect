#!/bin/sh

docker run --rm -ti -p 5432:5432 -e POSTGRES_USER=username -e POSTGRES_PASSWORD=password -e POSTGRES_DB=falafel postgres