" Start dein bootstrap.
if &compatible
  set nocompatible
endif

set runtimepath+=~/.dein/repos/github.com/Shougo/dein.vim

if dein#load_state('~/.dein')
  call dein#begin('~/.dein')

  " dein manages dein
  call dein#add('~/.dein/repos/github.com/Shougo/dein.vim')

  " Add or remove your plugins here like this:
  call dein#add('tpope/vim-sleuth')
  call dein#add('nanotech/jellybeans.vim')
  call dein#add('christoomey/vim-tmux-navigator')
  call dein#add('tmux-plugins/vim-tmux-focus-events')
  call dein#add('junegunn/fzf', { 'dir': './fzf', 'do': './install --bin' })
  call dein#add('junegunn/fzf.vim')
  call dein#add('scrooloose/nerdtree')

  call dein#end()
  call dein#save_state()
endif

filetype plugin indent on
syntax enable

" If you want to install not installed plugins on startup.
if dein#check_install()
  call dein#install()
endif

colorscheme jellybeans

" Enable mouse.
set mouse=a

" Enable line cursor in insert mode.
let $NVIM_TUI_ENABLE_CURSOR_SHAPE=1
let &t_SI.="\e[5 q"
let &t_SR.="\e[4 q"
let &t_EI.="\e[1 q"

" Ensure fzf excludes stuff in .gitignore.
let $FZF_DEFAULT_COMMAND='ag -g ""'

set number
set nostartofline
set noignorecase
set lazyredraw
set autoread
set updatetime=2000
set autochdir
set virtualedit=block
set undofile
set scrolloff=10
set tabstop=2
set nowrap
set autowrite
set hidden
set expandtab
set directory=$HOME/.vimdirs/swap
set undodir=$HOME/.vimdirs/undo

" Write files when NVIM loses focus.
au FocusLost * silent! wa

let mapleader = ","

" Hide search highlight.
nnoremap <leader>\ :nohl \| 2match none<CR>

" Edit nvim config.
nnoremap <leader>e :topleft vsplit ~/.config/nvim/init.vim<CR>

" Wipe line.
nnoremap <leader>x 0d$

" F1 = list and select buffer.
nnoremap <F1> :Buffers<CR>
inoremap <F1> :Buffers<CR>

" F4 = set paste mode.
set pastetoggle=<F4>

" F5-F7 = NERDTree.
noremap <F5> :execute 'NERDTreeToggle '.FindRootDirectory()<CR>
noremap <F6> :NERDTreeFind<CR>
noremap <F7> :NERDTreeFocus<CR>

noremap <F9> :tabprev<CR>
noremap <F10> :tabnext<CR>

" Ctrl-p fuzzy match.
nnoremap <C-P> :execute 'FZF '.FindRootDirectory()<CR>

" Ensure fzf excludes stuff in .gitignore.
let $FZF_DEFAULT_COMMAND='ag -g ""'

" Chdir to root, marked by .ctrlp file.
let g:rooter_patterns = ['.ctrlp']
let g:rooter_resolve_links = 0

function! s:IsDirectory(pattern)
  return stridx(a:pattern, '/') != -1
endfunction

function! s:FindAncestor(pattern)
  let fd_dir = isdirectory(s:fd) ? s:fd : fnamemodify(s:fd, ':h')

  if s:IsDirectory(a:pattern)
    let match = finddir(a:pattern, fnameescape(fd_dir).';')
  else
    let match = findfile(a:pattern, fnameescape(fd_dir).';')
  endif

  if empty(match)
    return ''
  endif

  if s:IsDirectory(a:pattern)
    return fnamemodify(match, ':p:h:h')
  else
    return fnamemodify(match, ':p:h')
  endif
endfunction

function! s:SearchForRootDirectory()
  for pattern in g:rooter_patterns
    let result = s:FindAncestor(pattern)
    if !empty(result)
      return result
    endif
  endfor
  return ''
endfunction

function! s:RootDirectory()
  let root_dir = getbufvar('%', 'rootDir')
  if empty(root_dir)
    let root_dir = s:SearchForRootDirectory()
    if !empty(root_dir)
      call setbufvar('%', 'rootDir', root_dir)
    endif
  endif
  return root_dir
endfunction

" For third-parties.  Not used by plugin.
function! FindRootDirectory()
  let s:fd = expand('%:p')

  if g:rooter_resolve_links
    let s:fd = resolve(s:fd)
  endif

  return s:RootDirectory()
endfunction
