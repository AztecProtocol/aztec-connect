#!/bin/bash
set -e
sudo useradd -d /mnt/user-data/$1 -G docker -s /bin/zsh $1
sudo cp -R ./users/$1 /mnt/user-data/
sudo chown -R $1.$1 /mnt/user-data/$1