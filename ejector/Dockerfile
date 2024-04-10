FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/zk-money

FROM node:18-alpine
RUN apk add --no-cache jq curl bash llvm15-libs
WORKDIR /usr/src/ejector
COPY ./data ./data
COPY --from=0 /usr/src /usr/src
COPY --from=1 /usr/src /usr/src/zk-money
COPY ./run.sh ./run.sh
RUN ln -s /usr/src/ejector/data /usr/src/yarn-project/falafel/data
EXPOSE 8081
EXPOSE 80
ENTRYPOINT ["/bin/sh", "./run.sh"]
RUN rm ./data/config
