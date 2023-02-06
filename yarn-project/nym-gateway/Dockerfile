FROM node:18 AS builder

WORKDIR /usr/src/nym-gateway
COPY . .

RUN yarn install
RUN yarn build

FROM node:18

WORKDIR /usr/src/nym-gateway

COPY --from=builder /usr/src/nym-gateway/package.json ./package.json
COPY --from=builder /usr/src/nym-gateway/dest ./dest
COPY --from=builder /usr/src/nym-gateway/start-nym.sh ./start-nym.sh


RUN yarn install --production

RUN apt-get -y update && apt install -y curl

RUN curl -L https://github.com/nymtech/nym/releases/download/nym-binaries-v1.1.7/nym-client --output nym-client
RUN chmod +x nym-client
RUN chmod +x start-nym.sh

EXPOSE 80
ENTRYPOINT ["./start-nym.sh"]
