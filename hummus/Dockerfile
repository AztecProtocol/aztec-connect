FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest

FROM node:14.8.0-alpine
COPY --from=0 /usr/src /usr/src
WORKDIR /usr/src/hummus
COPY . .
RUN yarn install && yarn test && yarn build && rm -rf node_modules && yarn install --production && yarn cache clean
CMD ["yarn", "start"]