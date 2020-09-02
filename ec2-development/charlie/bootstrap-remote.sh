#!/bin/bash
set -e

if [ ! -d "$HOME/.dein" ]; then
	curl https://raw.githubusercontent.com/Shougo/dein.vim/master/bin/installer.sh | bash -s ~/.dein
fi

if [ ! -d "$HOME/.zgen" ]; then
	git clone https://github.com/tarjoilija/zgen.git "${HOME}/.zgen"
fi

git config --global user.name "Charlie Lye"
git config --global user.email "karl.lye@gmail.com"

mkdir -p .vimdirs/swap
mkdir -p .vimdirs/undo