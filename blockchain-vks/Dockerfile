FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/barretenberg-x86_64-linux-clang

FROM node:16-alpine3.15
RUN apk update && apk add --no-cache bash curl
COPY --from=0 /usr/src/barretenberg/ /usr/src/barretenberg
WORKDIR /usr/src/blockchain-vks
COPY . .
RUN ./generate_vks.sh