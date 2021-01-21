FROM node:14.8.0-alpine

WORKDIR /usr/src/zk.money
COPY . .
RUN yarn install && yarn test && yarn build && rm -rf node_modules && yarn install --production && yarn cache clean
CMD ["yarn", "start"]