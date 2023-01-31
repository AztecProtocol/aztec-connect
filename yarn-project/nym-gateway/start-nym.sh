#!/bin/sh

./nym-client init --id=Aztec-$DEPLOY_TAG
./nym-client run --id=Aztec-$DEPLOY_TAG &
yarn start