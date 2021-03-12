import { WorldStateDb } from 'barretenberg/world_state_db';
import { EthereumBlockchain } from 'blockchain';
import http from 'http';
import moment from 'moment';
import 'reflect-metadata';
import 'source-map-support/register';
import { createConnection } from 'typeorm';
import { appFactory } from './app';
import { Server, ServerConfig } from './server';
import 'log-timestamp';
import { getConfig } from './config';
import { EthAddress } from 'barretenberg/address';
import { Metrics } from './metrics';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Container } from 'typedi';
import { CachedRollupDb, TypeOrmRollupDb } from './rollup_db';

async function main() {
  const {
    ormConfig,
    provider,
    ethConfig,
    confVars: {
      halloumiHost,
      rollupContractAddress,
      numInnerRollupTxs,
      numOuterRollupProofs,
      publishInterval,
      apiPrefix,
      serverAuthToken,
      port,
      gasLimit,
      baseTxGas,
      feeGasPrice,
      feeGasPriceMultiplier,
      reimbursementFeeLimit,
      maxUnsettledTxs,
    },
  } = await getConfig();

  const connection = await createConnection(ormConfig);
  const blockchain = await EthereumBlockchain.new(ethConfig, EthAddress.fromString(rollupContractAddress!), provider);
  const barretenberg = await BarretenbergWasm.new();

  const serverConfig: ServerConfig = {
    halloumiHost,
    numInnerRollupTxs,
    numOuterRollupProofs,
    publishInterval: moment.duration(publishInterval, 's'),
    gasLimit,
    baseTxGas,
    feeGasPrice,
    feeGasPriceMultiplier,
    reimbursementFeeLimit,
    maxUnsettledTxs,
  };
  const rollupDb = new CachedRollupDb(new TypeOrmRollupDb(connection));
  await rollupDb.init();
  const worldStateDb = new WorldStateDb();
  const metrics = new Metrics(worldStateDb, rollupDb, blockchain);
  const server = new Server(serverConfig, blockchain, rollupDb, worldStateDb, metrics, provider, barretenberg);

  const shutdown = async () => {
    await server.stop();
    await connection.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  Container.set({ id: 'barretenberg', factory: () => barretenberg });
  Container.set({ id: 'connection', factory: () => connection });
  Container.set({ id: 'rollupDb', factory: () => rollupDb });
  Container.set({ id: 'server', factory: () => server });
  const app = appFactory(server, apiPrefix, metrics, serverAuthToken);

  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);
  console.log(`Server listening on port ${port}.`);

  await server.start();
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});
