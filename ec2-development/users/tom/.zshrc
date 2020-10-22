# vim plugin manager
if [ ! -d "$HOME/.dein" ]; then
	curl https://raw.githubusercontent.com/Shougo/dein.vim/master/bin/installer.sh | bash -s ~/.dein
fi

mkdir -p .vimdirs/swap
mkdir -p .vimdirs/undo

# zgen
if [ ! -d "$HOME/.zgen" ]; then
	git clone https://github.com/tarjoilija/zgen.git "${HOME}/.zgen"
fi

source "${HOME}/.zgen/zgen.zsh"

if ! zgen saved; then
  # specify plugins here
  zgen oh-my-zsh
  zgen oh-my-zsh plugins/git
  zgen oh-my-zsh plugins/aws
  zgen oh-my-zsh plugins/vi-mode
  zgen load miekg/lean
  zgen load lukechilds/zsh-nvm

  # generate the init script from plugins above
  zgen save
fi

# change cursor shape in iTerm2
function zle-keymap-select zle-line-init
{
    case $KEYMAP in
        vicmd)      echo -ne '\e[1 q';;
        viins|main) echo -ne '\e[5 q';;
    esac

    zle reset-prompt
    zle -R
}

function zle-line-finish
{
    print -n -- "\E]50;CursorShape=0\C-G"  # block cursor
}

zle -N zle-line-init
zle -N zle-line-finish
zle -N zle-keymap-select

# options
setopt no_share_history
setopt rm_star_silent
setopt +o nomatch

# key bindings
bindkey    "^[[3~"          delete-char
bindkey    "^[3;5~"         delete-char

# exports
export LS_COLORS=
export PATH="$(yarn global bin):$PATH"
export WASMTIME_HOME="$HOME/.wasmtime"
export PATH="$WASMTIME_HOME/bin:$PATH"

# If this shell is not in isolated namespace, launch isolated shell.
if ! lsns -t net -p $$ -o command -n -r | grep -q "zsh"; then
  sudo -E netns $USER
  exit 0
fi