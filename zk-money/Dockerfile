FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest

FROM node:14.8.0-alpine
COPY --from=0 /usr/src/sdk/dist /usr/src/sdk/dist
WORKDIR /usr/src/zk-money
COPY . .
RUN apk add git
RUN cd lambda && yarn install
RUN cd ..
RUN yarn install && yarn test && yarn build && yarn build:lambda
CMD []
