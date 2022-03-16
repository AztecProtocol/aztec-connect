FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest

FROM node:14-alpine
COPY --from=0 /usr/src /usr/src
WORKDIR /usr/src/zk-money
COPY . .
RUN apk add git zip
RUN yarn install && yarn build
RUN cd lambda && yarn install && yarn build && cp twitter_lambda.zip ../dist

FROM node:14-alpine
COPY --from=1 /usr/src/zk-money/dist /usr/src/zk-money/dist