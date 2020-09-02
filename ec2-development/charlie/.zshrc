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

function zle-keymap-select zle-line-init
{
    # change cursor shape in iTerm2
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

setopt no_share_history
setopt rm_star_silent

bindkey    "^[[3~"          delete-char
bindkey    "^[3;5~"         delete-char

export LS_COLORS=

setopt +o nomatch
