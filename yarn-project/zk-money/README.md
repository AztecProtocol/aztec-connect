# ZK-Money

## Running locally

To run locally make sure that you run `yarn start:dev` this will by default point at devnet.

## Deployment notes

Post a fresh set of devnet / testnet contracts being deployed there is a manual process to get zk-money in a ready state.

1. Configure the correct api key for devnet / testnet - you will need to do so in the file named yarn-project/zk-money/src/toolbox/data_provider_content_viewer/data_provider_content_viewer.tsx.
2. You will then need to start up zk-money in dev mode `yarn start:dev` and navigate to `localhost:8080/toolbox`.
3. On the toolbox page you will need to run `fetchDataProviderContent`
4. From there you will need to copy the values for the environment you are targeting, then paste them inside `yarn-project/zk-money/src/alt-model/registrations_data/registrations_data_raw.ts`.
