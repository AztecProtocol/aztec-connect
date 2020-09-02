#!/bin/bash
set -e
HOST=mainframe.aztecprotocol.com
scp ./$1/id_rsa.pub ubuntu@$HOST:$1.pub
cat bootstrap-user-remote.sh | ssh ubuntu@$HOST bash -s - $1