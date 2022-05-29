FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/sdk:latest
# Although this isn't used by the code, including it here ensures it's pulled in the build scripts
# and tagged correctly for use by docker-compose. Let's call it a feature...
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/halloumi:latest
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/hummus:latest

FROM node:16-alpine
COPY --from=0 /usr/src /usr/src
ENV CHROME_BIN="/usr/bin/chromium-browser" PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
RUN apk update && apk add --no-cache udev ttf-freefont chromium
WORKDIR /usr/src/end-to-end
COPY . .
RUN yarn install --frozen-lockfile
ENV DEBUG=bb:*
CMD ["yarn", "test"]