FROM 278380418400.dkr.ecr.us-east-2.amazonaws.com/barretenberg.js:latest

FROM node:12-alpine
COPY --from=0 /usr/src/barretenberg.js/dest-es /usr/src/barretenberg.js/dest-es
WORKDIR /usr/src/hummus
COPY . .
RUN yarn install && yarn test && yarn build && rm -rf node_modules && yarn install --production && yarn cache clean
CMD ["yarn", "start"]