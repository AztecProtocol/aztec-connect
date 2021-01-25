import { ApolloServer } from 'apollo-server-koa';
import { Block, BlockServerResponse, GetBlocksServerResponse } from 'barretenberg/block_source';
import { RollupServerResponse, TxServerResponse, Proof, RollupProviderStatus } from 'barretenberg/rollup_provider';
import { WorldStateDb } from 'barretenberg/world_state_db';
import graphqlPlayground from 'graphql-playground-middleware-koa';
import Koa from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import { PromiseReadable } from 'promise-readable';
import { buildSchemaSync } from 'type-graphql';
import { Container } from 'typedi';
import { Connection } from 'typeorm';
import { DefaultState, Context } from 'koa';
import { TxDao } from './entity/tx';
import { RollupResolver, TxResolver, ServerStatusResolver } from './resolver';
import { Server } from './server';
import { RollupDao } from './entity/rollup';
import { Metrics } from './metrics';
import { blockchainStatusToJson } from 'barretenberg/blockchain';

// eslint-disable-next-line
const cors = require('@koa/cors');

const toBlockResponse = (block: Block): BlockServerResponse => ({
  ...block,
  txHash: block.txHash.toString(),
  rollupProofData: block.rollupProofData.toString('hex'),
  viewingKeysData: block.viewingKeysData.toString('hex'),
  created: block.created.toISOString(),
  gasPrice: block.gasPrice.toString(),
});

const toRollupResponse = ({
  id,
  dataRoot,
  ethTxHash,
  mined,
  rollupProof,
  created,
}: RollupDao): RollupServerResponse => ({
  id,
  status: mined ? 'SETTLED' : ethTxHash ? 'PUBLISHED' : 'CREATING',
  dataRoot: dataRoot.toString('hex'),
  proofData: rollupProof.proofData.toString('hex'),
  txHashes: rollupProof.txs.map(tx => tx.id.toString('hex')),
  ethTxHash: ethTxHash ? ethTxHash.toString('hex') : undefined,
  created: created.toISOString(),
});

const toTxResponse = ({
  id: txId,
  rollupProof,
  proofData,
  viewingKey1,
  viewingKey2,
  created,
}: TxDao): TxServerResponse => ({
  txHash: txId.toString('hex'),
  rollup:
    rollupProof && rollupProof.rollup
      ? {
          id: rollupProof.rollup.id,
          status: rollupProof.rollup.mined ? 'SETTLED' : rollupProof.rollup.ethTxHash ? 'PUBLISHED' : 'CREATING',
        }
      : undefined,
  proofData: proofData.toString('hex'),
  viewingKeys: [viewingKey1, viewingKey2].map(vk => vk.toString('hex')),
  created: created.toISOString(),
});

const bufferFromHex = (hexStr: string) => Buffer.from(hexStr.replace(/^0x/i, ''), 'hex');

export function appFactory(
  server: Server,
  prefix: string,
  metrics: Metrics,
  connection: Connection,
  worldStateDb: WorldStateDb,
  serverStatus: RollupProviderStatus,
  serverAuthToken: string,
) {
  const router = new Router<DefaultState, Context>({ prefix });

  const validateAuth = async (ctx: Koa.Context, next: () => Promise<void>) => {
    const authToken = ctx.request.headers['server-auth-token'];

    if (authToken !== serverAuthToken) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid server auth token.' };
    } else {
      await next();
    }
  };

  const exceptionHandler = async (ctx: Koa.Context, next: () => Promise<void>) => {
    try {
      await next();
    } catch (err) {
      console.log(err);
      ctx.status = 400;
      ctx.body = { error: err.message };
    }
  };

  router.get('/', async (ctx: Koa.Context) => {
    ctx.body = {
      serviceName: 'falafel',
    };
    ctx.status = 200;
  });

  router.post('/tx', async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const { proofData, viewingKeys, depositSignature } = JSON.parse((await stream.readAll()) as string);
    const tx: Proof = {
      proofData: bufferFromHex(proofData),
      viewingKeys: viewingKeys.map((v: string) => bufferFromHex(v)),
      depositSignature: depositSignature ? bufferFromHex(depositSignature) : undefined,
    };
    const txId = await server.receiveTx(tx);
    const response = {
      txHash: txId.toString('hex'),
    };
    ctx.body = response;
    ctx.status = 200;
  });

  // TODO: Unify get-blocks and get-rollups.
  router.get('/get-blocks', async (ctx: Koa.Context) => {
    const blocks = await server.getBlocks(+ctx.query.from);
    const response: GetBlocksServerResponse = {
      latestRollupId: await server.getLatestRollupId(),
      blocks: blocks.map(toBlockResponse),
    };
    ctx.body = response;
    ctx.status = 200;
  });

  router.get('/get-rollups', async (ctx: Koa.Context) => {
    const rollups = await server.getLatestRollups(+ctx.query.count);
    ctx.body = rollups.map(toRollupResponse);
    ctx.status = 200;
  });

  router.get('/get-rollup', async (ctx: Koa.Context) => {
    const rollup = await server.getRollup(+ctx.query.id);
    ctx.body = rollup ? toRollupResponse(rollup) : undefined;
    ctx.status = 200;
  });

  router.get('/get-txs', async (ctx: Koa.Context) => {
    let txs;
    if (ctx.query.txIds) {
      const txIds = (ctx.query.txIds as string).split(',').map(txId => bufferFromHex(txId));
      txs = await server.getTxs(txIds);
    } else {
      txs = await server.getLatestTxs(+ctx.query.count);
    }
    ctx.body = txs.map(toTxResponse);
    ctx.status = 200;
  });

  router.get('/get-tx', async (ctx: Koa.Context) => {
    const tx = await server.getTx(bufferFromHex(ctx.query.txHash));
    ctx.body = tx ? toTxResponse(tx) : undefined;
    ctx.status = 200;
  });

  router.get('/get-pending-note-nullifiers', async (ctx: Koa.Context) => {
    const nullifiers = await server.getPendingNoteNullifiers();
    ctx.body = nullifiers.map(n => n.toString('hex'));
    ctx.status = 200;
  });

  router.get('/remove-data', validateAuth, async (ctx: Koa.Context) => {
    await server.removeData();
    ctx.status = 200;
  });

  router.get('/flush', validateAuth, async (ctx: Koa.Context) => {
    await server.flushTxs();
    ctx.status = 200;
  });

  router.get('/status', async (ctx: Koa.Context) => {
    const status = await server.getStatus();
    const response = {
      blockchainStatus: blockchainStatusToJson(status.blockchainStatus),
      minFees: status.minFees.map(f => f.toString()),
    };
    ctx.set('content-type', 'application/json');
    ctx.body = response;
    ctx.status = 200;
  });

  router.get('/metrics', async (ctx: Koa.Context) => {
    ctx.body = await metrics.getMetrics();
    ctx.status = 200;
  });

  router.all('/playground', graphqlPlayground({ endpoint: `${prefix}/graphql` }));

  const app = new Koa();
  app.proxy = true;
  app.use(compress());
  app.use(cors());
  app.use(exceptionHandler);
  app.use(router.routes());
  app.use(router.allowedMethods());

  Container.set({ id: 'connection', factory: () => connection });
  Container.set({ id: 'worldStateDb', factory: () => worldStateDb });
  Container.set({ id: 'serverStatus', factory: () => serverStatus });
  Container.set({ id: 'server', factory: () => server });
  const schema = buildSchemaSync({
    resolvers: [RollupResolver, TxResolver, ServerStatusResolver],
    container: Container,
  });
  const appServer = new ApolloServer({ schema, introspection: true });
  appServer.applyMiddleware({ app, path: `${prefix}/graphql` });

  return app;
}
