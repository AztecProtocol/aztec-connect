FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest

FROM node:14-alpine
COPY --from=0 /usr/src/sdk/dist /usr/src/sdk/dist
WORKDIR /usr/src/documentation
COPY . .

RUN yarn install && yarn test && yarn build
CMD []
