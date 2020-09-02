#!/bin/bash
set -e

sudo yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm || true
sudo yum install -y git gcc gcc-c++ kernel-devel make ncurses-devel zsh htop openssl-devel docker

# DOCKER
sudo systemctl start docker

# TMUX INSTALL ---------------
if [ ! -f /usr/local/bin/tmux ]; then
	mkdir tmux-build
	cd tmux-build
	# libevent
	curl -OL https://github.com/libevent/libevent/releases/download/release-2.0.22-stable/libevent-2.0.22-stable.tar.gz
	tar -xvzf libevent-2.0.22-stable.tar.gz
	cd libevent-2.0.22-stable
	./configure --prefix=/usr/local
	make -j$(nproc)
	sudo make install
	cd ..
	# tmux
	curl -OL https://github.com/tmux/tmux/releases/download/2.3/tmux-2.3.tar.gz
	tar -xvzf tmux-2.3.tar.gz
	cd tmux-2.3
	LDFLAGS="-L/usr/local/lib -Wl,-rpath=/usr/local/lib" ./configure --prefix=/usr/local
	make -j$(nproc)
	sudo make install
	cd ../..
	# cleanup
	rm -rf tmux-build
fi

# CMAKE INSTALL ---------------
if [ ! -f /usr/local/bin/cmake ]; then
	curl -OL https://cmake.org/files/v3.16/cmake-3.16.4.tar.gz
	tar zxfv cmake-3.16.4.tar.gz
	cd cmake-3.16.4
	./bootstrap
	make -j$(nproc)
	sudo make install
	cd ..
	rm -rf cmake*
fi

# GCC9 INSTALL ---------------
if [ ! -f /usr/local/bin/gcc ]; then
	GCC_VERSION=9.2.0
	wget https://ftp.gnu.org/gnu/gcc/gcc-${GCC_VERSION}/gcc-${GCC_VERSION}.tar.gz
	tar xzvf gcc-${GCC_VERSION}.tar.gz
	mkdir obj.gcc-${GCC_VERSION}
	cd gcc-${GCC_VERSION}
	./contrib/download_prerequisites
	cd ../obj.gcc-${GCC_VERSION}
	../gcc-${GCC_VERSION}/configure --disable-multilib --enable-languages=c,c++
	make -j $(nproc)
	sudo make install
	cd ..
	rm -rf gcc* obj.gcc*
fi
