FROM aztecprotocol/barretenberg.js:latest

FROM node:10-alpine
WORKDIR /usr/src/barretenberg.js/dest-es
COPY --from=0 /usr/src/barretenberg.js/dest-es .
WORKDIR /usr/src/hummus
COPY . .
RUN yarn install && yarn test && yarn build && rm -rf node_modules && yarn install --production && yarn cache clean
CMD ["yarn", "start"]