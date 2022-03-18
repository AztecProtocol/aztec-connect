import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import {
  AssetValueServerResponse,
  PendingTxServerResponse,
  rollupProviderStatusToJson,
  RuntimeConfig,
  runtimeConfigFromJson,
  TxPostData,
  TxServerResponse,
} from '@aztec/barretenberg/rollup_provider';
import { numToInt32BE, serializeBufferArrayToVector } from '@aztec/barretenberg/serialize';
import cors from '@koa/cors';
import { ApolloServer } from 'apollo-server-koa';
import graphqlPlayground from 'graphql-playground-middleware-koa';
import Koa, { Context, DefaultState } from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import { PromiseReadable } from 'promise-readable';
import requestIp from 'request-ip';
import { buildSchemaSync } from 'type-graphql';
import { Container } from 'typedi';
import { TxDao } from './entity/tx';
import { Metrics } from './metrics';
import { JoinSplitTxResolver, RollupResolver, ServerStatusResolver, TxResolver } from './resolver';
import { Server } from './server';
import { Tx } from './tx_receiver';

const toTxResponse = ({ proofData, offchainTxData }: TxDao): TxServerResponse => ({
  proofData: proofData.toString('hex'),
  offchainData: offchainTxData.toString('hex'),
});

const toAssetValueResponse = ({ assetId, value }: AssetValue): AssetValueServerResponse => ({
  assetId,
  value: value.toString(),
});

const bufferFromHex = (hexStr: string) => Buffer.from(hexStr.replace(/^0x/i, ''), 'hex');

const fromTxPostData = (data: TxPostData): Tx => ({
  proof: new ProofData(bufferFromHex(data.proofData)),
  offchainTxData: bufferFromHex(data.offchainTxData),
  depositSignature: data.depositSignature ? bufferFromHex(data.depositSignature) : undefined,
});

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
    } catch (err: any) {
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

  router.post('/txs', recordMetric, checkReady, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const postData = JSON.parse((await stream.readAll()) as string);
    const txs = postData.map(fromTxPostData);
    const txIds = await server.receiveTxs(txs);
    const response = {
      txIds: txIds.map(txId => txId.toString('hex')),
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
    const blocks = server.getBlockBuffers(+ctx.query.from);
    const response = Buffer.concat([
      numToInt32BE(await server.getLatestRollupId()),
      serializeBufferArrayToVector(blocks),
    ]);
    ctx.compress = true;
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

  router.patch('/runtime-config', recordMetric, validateAuth, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const runtimeConfig: Partial<RuntimeConfig> = runtimeConfigFromJson(JSON.parse((await stream.readAll()) as string));
    server.setRuntimeConfig(runtimeConfig);
    ctx.status = 200;
  });

  router.get('/flush', recordMetric, validateAuth, async (ctx: Koa.Context) => {
    server.flushTxs();
    ctx.status = 200;
  });

  router.get('/status', recordMetric, async (ctx: Koa.Context) => {
    const status = await server.getStatus();
    const response = rollupProviderStatusToJson(status);
    ctx.set('content-type', 'application/json');
    ctx.body = response;
    ctx.status = 200;
  });

  router.post('/tx-fees', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const data = JSON.parse((await stream.readAll()) as string);
    const assetId = +data.assetId;
    const txFees = await server.getTxFees(assetId);

    ctx.set('content-type', 'application/json');
    ctx.body = txFees.map(fees => fees.map(toAssetValueResponse));
    ctx.status = 200;
  });

  router.post('/defi-fees', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const data = JSON.parse((await stream.readAll()) as string);
    const bridgeId = BigInt(data.bridgeId);
    const defiFees = await server.getDefiFees(bridgeId);

    ctx.set('content-type', 'application/json');
    ctx.body = defiFees.map(toAssetValueResponse);
    ctx.status = 200;
  });

  router.get('/get-initial-world-state', recordMetric, checkReady, async (ctx: Koa.Context) => {
    const response = await server.getInitialWorldState();
    ctx.body = response.initialAccounts;
    ctx.status = 200;
  });

  router.get('/get-pending-txs', recordMetric, async (ctx: Koa.Context) => {
    const txs = await server.getUnsettledTxs();
    ctx.body = txs
      .map(tx => new ProofData(tx.proofData))
      .map(
        (proof): PendingTxServerResponse => ({
          txId: proof.txId.toString('hex'),
          noteCommitment1: proof.noteCommitment1.toString('hex'),
          noteCommitment2: proof.noteCommitment2.toString('hex'),
        }),
      );
    ctx.status = 200;
  });

  router.get('/get-pending-note-nullifiers', recordMetric, async (ctx: Koa.Context) => {
    const nullifiers = await server.getUnsettledNullifiers();
    ctx.body = nullifiers.map(n => n.toString('hex'));
    ctx.status = 200;
  });

  router.post('/get-latest-account-nonce', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const data = JSON.parse((await stream.readAll()) as string);
    const accountPubKey = GrumpkinAddress.fromString(data.accountPubKey);
    ctx.body = await server.getLatestAccountNonce(accountPubKey);
    ctx.status = 200;
  });

  router.post('/get-latest-alias-nonce', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const { alias } = JSON.parse((await stream.readAll()) as string);
    ctx.body = await server.getLatestAliasNonce(alias);
    ctx.status = 200;
  });

  router.post('/get-account-id', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const { alias, nonce } = JSON.parse((await stream.readAll()) as string);
    const accountId = await server.getAccountId(alias, nonce ? +nonce : undefined);
    ctx.body = accountId?.toString() || '';
    ctx.status = 200;
  });

  router.get('/get-unsettled-account-txs', recordMetric, async (ctx: Koa.Context) => {
    const txs = await server.getUnsettledAccountTxs();
    ctx.body = txs.map(toTxResponse);
    ctx.status = 200;
  });

  router.get('/get-unsettled-payment-txs', recordMetric, async (ctx: Koa.Context) => {
    const txs = await server.getUnsettledPaymentTxs();
    ctx.body = txs.map(toTxResponse);
    ctx.status = 200;
  });

  router.get('/metrics', recordMetric, async (ctx: Koa.Context) => {
    ctx.body = await metrics.getMetrics();
    ctx.status = 200;
  });

  router.all('/playground', recordMetric, graphqlPlayground({ endpoint: `${prefix}/graphql` }));

  const app = new Koa();
  app.proxy = true;
  app.use(compress({ br: false } as any));
  app.use(cors());
  app.use(exceptionHandler);
  app.use(router.routes());
  app.use(router.allowedMethods());

  const schema = buildSchemaSync({
    resolvers: [JoinSplitTxResolver, RollupResolver, TxResolver, ServerStatusResolver],
    container: Container,
  });
  const appServer = new ApolloServer({ schema, introspection: true });
  appServer.applyMiddleware({ app, path: `${prefix}/graphql` });

  return app;
}
