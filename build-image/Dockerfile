FROM alpine:latest
RUN apk add --no-cache python3 py3-pip git openssh-client ca-certificates jq bash \
    && pip3 install --upgrade pip \
    && pip3 install --no-cache-dir awscli