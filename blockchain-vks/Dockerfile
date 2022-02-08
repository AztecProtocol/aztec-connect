FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg-x86_64-linux-clang

FROM node:14-alpine
RUN apk update && apk add --no-cache bash curl
COPY --from=0 /usr/src/barretenberg/ /usr/src/barretenberg
WORKDIR /usr/src/blockchain-vks
COPY ./generate_vks.sh .
RUN ./generate_vks.sh