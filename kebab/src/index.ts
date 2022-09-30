import 'log-timestamp';
import http from 'http';
import { createConnection } from 'typeorm';

import { getComponents } from './config';
import { Configurator, RedeployConfig } from './configurator';
import { Server } from './server';
import { appFactory } from './app';
import { EthLogsDb } from './logDb';
import { deployToBlockchain } from './deploy';
import { EthAddress } from '@aztec/barretenberg/address';

const { ROLLUP_CONTRACT_ADDRESS } = process.env;

const configurator = new Configurator();

async function main() {
  const { ormConfig, provider, chainId } = await getComponents(configurator);
  const initialConfig = configurator.getConfVars();

  if (ROLLUP_CONTRACT_ADDRESS) {
    console.log(`Rollup contract address provided: ${ROLLUP_CONTRACT_ADDRESS}. Will not redeploy`);
    // we have been given a rollup contract address directly
    // we won't deploy anything
    const redeployConfig: RedeployConfig = {
      rollupContractAddress: EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS),
    };
    configurator.saveRedeployConfig(redeployConfig);
  } else {
    console.log('No rollup contract address provided, checking redploy flag...');
    // we haven't been given a rollup address, redeploy contracts
    const redeployConfig = await deployToBlockchain(initialConfig.redeployConfig.redeploy);

    if (redeployConfig) {
      configurator.saveRedeployConfig(redeployConfig);
    }
  }

  const configuration = configurator.getConfVars();
  const { redeployConfig: contractConfig, allowPrivilegedMethods, port, apiPrefix } = configuration;

  console.log(`Rollup contract address: ${contractConfig.rollupContractAddress}`);
  console.log(`Allow privileged methods: ${allowPrivilegedMethods}`);
  console.log(`Chain id: ${chainId}`);

  const dbConn = await createConnection(ormConfig);
  const logDb = new EthLogsDb(dbConn);
  const server = new Server(provider, logDb, chainId, allowPrivilegedMethods, contractConfig);

  const shutdown = async () => {
    await server.stop();
    await dbConn.close();
    process.exit(0);
  };

  const shutdownAndClearDb = async () => {
    await server.stop();
    await logDb.eraseDb();
    await dbConn.close();
    console.log('Kebab Database erased.');
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('SIGUSR1', shutdownAndClearDb);

  const app = appFactory(server, apiPrefix);
  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);
  console.log(`Kebab Server listening on port ${port}.`);

  await server.start();
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});
