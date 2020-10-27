#!/bin/bash
set -e
HOST=mainframe.aztecprotocol.com
ssh ubuntu@$HOST sudo useradd -d /mnt/user-data/$1 -G docker -s /bin/zsh $1
scp -R ./defaults/* ubuntu@$HOST:/mnt/user-data/$1/
scp -R ./users/$1 ubuntu@$HOST:/mnt/user-data/
ssh ubuntu@$HOST sudo chown -R $1.$1 /mnt/user-data/$1