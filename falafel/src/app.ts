import { ApolloServer } from 'apollo-server-koa';
import { blockchainStatusToJson } from 'barretenberg/blockchain';
import { Block, BlockServerResponse, GetBlocksServerResponse } from 'barretenberg/block_source';
import { Proof } from 'barretenberg/rollup_provider';
import { ViewingKey } from 'barretenberg/viewing_key';
import graphqlPlayground from 'graphql-playground-middleware-koa';
import Koa, { Context, DefaultState } from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import { PromiseReadable } from 'promise-readable';
import { buildSchemaSync } from 'type-graphql';
import { Container } from 'typedi';
import { Metrics } from './metrics';
import { JoinSplitTxResolver, AccountTxResolver, RollupResolver, ServerStatusResolver, TxResolver } from './resolver';
import { Server } from './server';
import cors from '@koa/cors';
import requestIp from 'request-ip';

const toBlockResponse = (block: Block): BlockServerResponse => ({
  ...block,
  txHash: block.txHash.toString(),
  rollupProofData: block.rollupProofData.toString('hex'),
  viewingKeysData: block.viewingKeysData.toString('hex'),
  created: block.created.toISOString(),
  gasPrice: block.gasPrice.toString(),
});

const bufferFromHex = (hexStr: string) => Buffer.from(hexStr.replace(/^0x/i, ''), 'hex');

export function appFactory(server: Server, prefix: string, metrics: Metrics, serverAuthToken: string) {
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

  const recordMetric = async (ctx: Koa.Context, next: () => Promise<void>) => {
    metrics.httpEndpoint(ctx.URL.pathname);
    await next();
  };

  const checkReady = async (ctx: Koa.Context, next: () => Promise<void>) => {
    if (!server.isReady()) {
      ctx.status = 503;
      ctx.body = { error: 'Server not ready. Try again later.' };
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

  router.get('/', recordMetric, async (ctx: Koa.Context) => {
    ctx.body = {
      serviceName: 'falafel',
      isReady: server.isReady(),
    };
    ctx.status = 200;
  });

  router.post('/tx', recordMetric, checkReady, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const { proofData, viewingKeys, depositSignature } = JSON.parse((await stream.readAll()) as string);
    const tx: Proof = {
      proofData: bufferFromHex(proofData),
      viewingKeys: viewingKeys.map((v: string) => ViewingKey.fromString(v)),
      depositSignature: depositSignature ? bufferFromHex(depositSignature) : undefined,
    };
    const txId = await server.receiveTx(tx);
    const response = {
      txHash: txId.toString('hex'),
    };
    ctx.body = response;
    ctx.status = 200;
  });

  router.post('/client-log', async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const log = JSON.parse((await stream.readAll()) as string);
    const clientIp = requestIp.getClientIp(ctx.request);
    const userAgent = ctx.request.header['user-agent'];
    const data = {
      ...log,
      clientIp,
      userAgent,
    };
    console.log(`Client log for: ${JSON.stringify(data)}`);
    ctx.status = 200;
  });

  router.get('/get-blocks', recordMetric, async (ctx: Koa.Context) => {
    const blocks = await server.getBlocks(+ctx.query.from);
    const response: GetBlocksServerResponse = {
      latestRollupId: await server.getLatestRollupId(),
      blocks: blocks.map(toBlockResponse),
    };
    ctx.body = response;
    ctx.status = 200;
  });

  router.get('/remove-data', recordMetric, validateAuth, async (ctx: Koa.Context) => {
    await server.removeData();
    ctx.status = 200;
  });

  router.get('/reset', recordMetric, validateAuth, async (ctx: Koa.Context) => {
    await server.resetPipline();
    ctx.status = 200;
  });

  router.get('/ready', recordMetric, validateAuth, async (ctx: Koa.Context) => {
    const ready = !!+ctx.query.ready;
    server.setReady(ready);
    ctx.status = 200;
  });

  router.get('/flush', recordMetric, validateAuth, async (ctx: Koa.Context) => {
    await server.flushTxs();
    ctx.status = 200;
  });

  router.get('/status', recordMetric, async (ctx: Koa.Context) => {
    const status = await server.getStatus();
    const response = {
      ...status,
      blockchainStatus: blockchainStatusToJson(status.blockchainStatus),
      txFees: status.txFees.map(({ feeConstants, baseFeeQuotes }) => ({
        feeConstants: feeConstants.map(constant => constant.toString()),
        baseFeeQuotes: baseFeeQuotes.map(({ fee, time }) => ({
          time,
          fee: fee.toString(),
        })),
      })),
    };

    ctx.set('content-type', 'application/json');
    ctx.body = response;
    ctx.status = 200;
  });

  router.get('/get-pending-txs', recordMetric, async (ctx: Koa.Context) => {
    const txIds = await server.getUnsettledTxs();
    ctx.body = txIds.map(txId => txId.toString('hex'));
    ctx.status = 200;
  });

  router.get('/get-pending-note-nullifiers', recordMetric, async (ctx: Koa.Context) => {
    const nullifiers = await server.getUnsettledNullifiers();
    ctx.body = nullifiers.map(n => n.toString('hex'));
    ctx.status = 200;
  });

  router.get('/set-topology', recordMetric, validateAuth, async (ctx: Koa.Context) => {
    const numOuterRollupProofs = +(ctx.query['num-outer-proofs'] as string);
    if (!numOuterRollupProofs || numOuterRollupProofs > 32 || numOuterRollupProofs & (numOuterRollupProofs - 1)) {
      throw new Error('Bad topology, num-outer-proofs must be 1 to 32, powers of 2.');
    }
    server.setTopology(numOuterRollupProofs);
    ctx.status = 200;
  });

  router.get('/metrics', recordMetric, async (ctx: Koa.Context) => {
    ctx.body = await metrics.getMetrics();
    ctx.status = 200;
  });

  router.all('/playground', recordMetric, graphqlPlayground({ endpoint: `${prefix}/graphql` }));

  const app = new Koa();
  app.proxy = true;
  app.use(compress());
  app.use(cors());
  app.use(exceptionHandler);
  app.use(router.routes());
  app.use(router.allowedMethods());

  const schema = buildSchemaSync({
    resolvers: [JoinSplitTxResolver, AccountTxResolver, RollupResolver, TxResolver, ServerStatusResolver],
    container: Container,
  });
  const appServer = new ApolloServer({ schema, introspection: true });
  appServer.applyMiddleware({ app, path: `${prefix}/graphql` });

  return app;
}
