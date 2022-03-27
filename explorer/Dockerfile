FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest

FROM node:14-alpine
COPY --from=0 /usr/src /usr/src
WORKDIR /usr/src/explorer
COPY . .
RUN yarn install && yarn build

FROM node:14-alpine
COPY --from=1 /usr/src/explorer/dist /usr/src/explorer/dist
