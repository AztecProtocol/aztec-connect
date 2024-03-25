FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/zk-money

FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/falafel
RUN apk add jq curl bash
COPY --from=0 /usr/src /usr/src/zk-money
EXPOSE 8081
EXPOSE 3001
WORKDIR /usr/src/ejector
COPY ./data ./data
COPY ./run.sh ./run.sh
RUN ln -s /usr/src/ejector/data /usr/src/yarn-project/falafel/data
ENTRYPOINT ["/bin/sh", "./run.sh"]
