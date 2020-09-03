#!/bin/bash
set -e
sudo useradd -d /mnt/user-data/$1 -G docker -s /bin/zsh $1
sudo mkdir -p /mnt/user-data/$1/.ssh
sudo cp ./$1/id_rsa.pub /mnt/user-data/$1/.ssh/authorized_keys
sudo chown -R $1.$1 /mnt/user-data/$1