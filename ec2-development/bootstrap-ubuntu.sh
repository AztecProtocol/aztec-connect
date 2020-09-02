#!/bin/bash
set -e

sudo apt-get update
sudo apt-get install -y gcc g++ clang cmake zsh python

# DOCKER
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
sudo apt update
apt-cache policy docker-ce
sudo apt install -y docker-ce

# YARN
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update
sudo apt install -y --no-install-recommends yarn

sudo mkdir -p /mnt/user-data
sudo mount /dev/nvme1n1 /mnt/user-data

sudo echo fs.inotify.max_user_watches=524288 >> /etc/sysctl.conf
sudo sysctl -p