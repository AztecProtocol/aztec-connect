FROM ubuntu:latest
RUN apt-get update && apt-get install -y build-essential wget git
RUN wget https://cmake.org/files/v3.15/cmake-3.16.4.tar.gz \
  && tar zxfv cmake-3.16.4.tar.gz \
  && cd cmake-3.16.4 \
  && ./bootstrap \
  && make -j8 \
  && make install \
  && cd .. \
  && rm -rf cmake*