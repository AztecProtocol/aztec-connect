FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest

FROM node:16-alpine3.15
COPY --from=0 /usr/src /usr/src
WORKDIR /usr/src/documentation
COPY . .

RUN yarn install && yarn test && yarn build
CMD []
