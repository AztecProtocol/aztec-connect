FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest
# Although this isn't used by the code, including it here ensures it's pulled in the build scripts
# and tagged correctly in CCI for use by docker-compose. Let's call it a feature...
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/halloumi:latest

FROM node:14-alpine
COPY --from=0 /usr/src /usr/src
WORKDIR /usr/src/end-to-end
COPY . .
RUN yarn install
CMD ["yarn", "test"]