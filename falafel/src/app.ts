import { ApolloServer } from 'apollo-server-koa';
import { Block, BlockServerResponse, GetBlocksServerResponse } from 'barretenberg/block_source';
import { RollupServerResponse, TxServerResponse, Proof, ProofServerResponse } from 'barretenberg/rollup_provider';
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
import { RollupDao } from './entity/rollup';
import { TxDao } from './entity/tx';
import { BlockResolver, RollupResolver, TxResolver, ServerStatusResolver } from './resolver';
import { Server, ServerConfig, ServerStatus } from './server';

const cors = require('@koa/cors');

const toBlockResponse = (block: Block): BlockServerResponse => ({
  ...block,
  txHash: block.txHash.toString('hex'),
  rollupProofData: block.rollupProofData.toString('hex'),
  viewingKeysData: block.viewingKeysData.toString('hex'),
  created: block.created.toISOString(),
});

const toRollupResponse = ({
  id,
  status,
  dataRoot,
  proofData,
  txs,
  ethBlock,
  ethTxHash,
  created,
}: RollupDao): RollupServerResponse => ({
  id,
  status,
  dataRoot: dataRoot.toString('hex'),
  proofData: proofData ? proofData.toString('hex') : undefined,
  txHashes: txs.map(tx => tx.txId.toString('hex')),
  ethBlock,
  ethTxHash: ethTxHash ? ethTxHash.toString('hex') : undefined,
  created: created.toISOString(),
});

const toTxResponse = ({ txId, rollup, proofData, viewingKey1, viewingKey2, created }: TxDao): TxServerResponse => ({
  txHash: txId.toString('hex'),
  rollup: !rollup
    ? undefined
    : {
        id: rollup.id,
        status: rollup.status,
      },
  proofData: proofData.toString('hex'),
  viewingKeys: [viewingKey1, viewingKey2].map(vk => vk.toString('hex')),
  created: created.toISOString(),
});

export function appFactory(
  server: Server,
  prefix: string,
  connection: Connection,
  worldStateDb: WorldStateDb,
  serverConfig: ServerConfig,
  serverStatus: ServerStatus,
) {
  const router = new Router<DefaultState, Context>({ prefix });

  router.get('/', async (ctx: Koa.Context) => {
    ctx.body = 'OK\n';
  });

  router.post('/tx', async (ctx: Koa.Context) => {
    try {
      const stream = new PromiseReadable(ctx.req);
      const { proofData, viewingKeys, depositSignature } = JSON.parse((await stream.readAll()) as string);
      const tx: Proof = {
        proofData: Buffer.from(proofData, 'hex'),
        viewingKeys: viewingKeys.map((v: string) => Buffer.from(v, 'hex')),
        depositSignature: depositSignature ? Buffer.from(depositSignature, 'hex') : undefined,
      };
      const txDao = await server.receiveTx(tx);
      const response: ProofServerResponse = {
        txHash: txDao.txId.toString('hex'),
      };
      ctx.status = 200;
      ctx.body = response;
    } catch (err) {
      console.log(err);
      ctx.status = 400;
      ctx.body = { error: err.message };
    }
  });

  router.get('/get-blocks', async (ctx: Koa.Context) => {
    const blocks = await server.getBlocks(+ctx.query.from);
    const response: GetBlocksServerResponse = {
      latestRollupId: server.getLatestRollupId(),
      blocks: blocks.map(toBlockResponse),
    };
    ctx.body = response;
  });

  router.get('/get-rollups', async (ctx: Koa.Context) => {
    try {
      const rollups = await server.getLatestRollups(+ctx.query.count);
      ctx.status = 200;
      ctx.body = rollups.map(toRollupResponse);
    } catch (err) {
      console.log(err);
      ctx.status = 400;
      ctx.body = { error: err.message };
    }
  });

  router.get('/get-rollup', async (ctx: Koa.Context) => {
    try {
      const rollup = await server.getRollup(+ctx.query.id);
      ctx.status = 200;
      ctx.body = rollup ? toRollupResponse(rollup) : undefined;
    } catch (err) {
      console.log(err);
      ctx.status = 400;
      ctx.body = { error: err.message };
    }
  });

  router.get('/get-txs', async (ctx: Koa.Context) => {
    try {
      let txs;
      if (ctx.query.txIds) {
        const txIds = (ctx.query.txIds as string).split(',').map(txId => Buffer.from(txId, 'hex'));
        txs = await server.getTxs(txIds);
      } else {
        txs = await server.getLatestTxs(+ctx.query.count);
      }
      ctx.status = 200;
      ctx.body = txs.map(toTxResponse);
    } catch (err) {
      console.log(err);
      ctx.status = 400;
      ctx.body = { error: err.message };
    }
  });

  router.get('/get-tx', async (ctx: Koa.Context) => {
    try {
      const tx = await server.getTx(Buffer.from(ctx.query.txHash, 'hex'));
      ctx.status = 200;
      ctx.body = tx ? toTxResponse(tx) : undefined;
    } catch (err) {
      console.log(err);
      ctx.status = 400;
      ctx.body = { error: err.message };
    }
  });

  router.post('/flush', async (ctx: Koa.Context) => {
    try {
      await server.flushTxs();
      ctx.status = 200;
    } catch (err) {
      console.log(err);
      ctx.body = { error: err.message };
      ctx.status = 400;
    }
  });

  router.get('/status', async (ctx: Koa.Context) => {
    ctx.body = await server.status();
  });

  router.all('/falafel', graphqlPlayground({ endpoint: '/graphql' }));

  const app = new Koa();
  app.proxy = true;
  app.use(compress());
  app.use(cors());
  app.use(router.routes());
  app.use(router.allowedMethods());

  Container.set({ id: 'connection', factory: () => connection });
  Container.set({ id: 'worldStateDb', factory: () => worldStateDb });
  Container.set({ id: 'serverConfig', factory: () => serverConfig });
  Container.set({ id: 'serverStatus', factory: () => serverStatus });
  const schema = buildSchemaSync({
    resolvers: [BlockResolver, RollupResolver, TxResolver, ServerStatusResolver],
    container: Container,
  });
  const appServer = new ApolloServer({ schema });
  appServer.applyMiddleware({ app });

  return app;
}
