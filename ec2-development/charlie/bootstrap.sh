#!/bin/bash
set -e
HOST=mainframe.aztecprotocol.com
scp .vimrc charlie@$HOST:.
scp .tmux.conf charlie@$HOST:.
scp .zshrc charlie@$HOST:.
ssh charlie@$HOST < bootstrap-remote.sh
