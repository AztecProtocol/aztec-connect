#!/bin/sh

./nym-client init --id=$DEPLOY_TAG
./nym-client run --id=$DEPLOY_TAG &
yarn start