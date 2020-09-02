#!/bin/bash
set -e

sudo apt-get update
sudo apt-get install -y gcc clang cmake zsh

# DOCKER
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
sudo apt update
apt-cache policy docker-ce
sudo apt install -y docker-ce

sudo mkdir -p /mnt/user-data
sudo mount /dev/nvme1n1 /mnt/user-data