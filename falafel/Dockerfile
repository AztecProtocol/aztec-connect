FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/setup-tools:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/setup-mpc-common:latest

FROM node:10
WORKDIR /usr/src/setup-mpc-common
COPY --from=1 /usr/src/setup-mpc-common .
RUN yarn link
WORKDIR /usr/src/setup-mpc-server
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn test && yarn build

# COPY package.json .
# RUN yarn install
# COPY . .
# RUN yarn test && yarn build

FROM ubuntu:latest
RUN apt update && \
  apt install -y curl && \
  curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
  apt update && \
  apt install -y nodejs yarn libgomp1 && \
  apt clean
COPY --from=0 /usr/src/setup-tools /usr/src/setup-tools
WORKDIR /usr/src/setup-mpc-common
COPY --from=1 /usr/src/setup-mpc-common .
RUN yarn link
WORKDIR /usr/src/setup-mpc-server
COPY --from=2 /usr/src/setup-mpc-server .
RUN yarn link setup-mpc-common
CMD [ "node", "./dest"]