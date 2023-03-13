import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { assetValueToJson } from '@aztec/barretenberg/asset';
import { JoinSplitProofData, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { fetch } from '@aztec/barretenberg/iso_fetch';
import {
  DepositTxJson,
  partialRuntimeConfigFromJson,
  PendingTxJson,
  rollupProviderStatusToJson,
  TxJson,
  initialWorldStateToBuffer,
  bridgePublishQueryFromJson,
  bridgePublishQueryResultToJson,
} from '@aztec/barretenberg/rollup_provider';
import { serializeBufferArrayToVector } from '@aztec/barretenberg/serialize';
import cors from '@koa/cors';
import fsExtra from 'fs-extra';
import Koa, { Context, DefaultState } from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import { PromiseReadable } from 'promise-readable';
import requestIp from 'request-ip';
import { configurator } from './configurator.js';
import { TxDao } from './entity/index.js';
import { Metrics } from './metrics/index.js';
import { Server } from './server.js';
import { Tx, TxRequest } from './tx_receiver/index.js';

const { mkdirp, writeJson } = fsExtra;

const toDepositTxJson = ({ proofData }: TxDao): DepositTxJson => {
  const proof = JoinSplitProofData.fromBuffer(proofData);
  return {
    assetId: proof.publicAssetId,
    value: proof.publicValue.toString(),
    publicOwner: proof.publicOwner.toLowerCaseAddress(),
  };
};

const toPendingTxJson = (proof: ProofData): PendingTxJson => ({
  txId: proof.txId.toString('hex'),
  noteCommitment1: proof.noteCommitment1.toString('hex'),
  noteCommitment2: proof.noteCommitment2.toString('hex'),
});

const bufferFromHex = (hexStr: string) => Buffer.from(hexStr.replace(/^0x/i, ''), 'hex');

const fromTxJson = (data: TxJson): Tx => ({
  proof: new ProofData(bufferFromHex(data.proofData)),
  offchainTxData: bufferFromHex(data.offchainTxData),
  depositSignature: data.depositSignature ? bufferFromHex(data.depositSignature) : undefined,
});

export function appFactory(server: Server, prefix: string, metrics: Metrics, serverAuthToken: string) {
  const router = new Router<DefaultState, Context>({ prefix });

  /* Ensure the version header (if present) matches the server version.
   * If the version header is not present, skip this validation.
   */
  const validateVersion = async (ctx: Koa.Context, next: () => Promise<void>) => {
    const version = ctx.request.headers['version'];

    if (version && server.version !== version) {
      ctx.status = 409; // 409 Conflict
      ctx.body = {
        error: `Rollup provider / SDK version mismatch. Hard refresh your browser or update SDK.`,
      };
    } else {
      await next();
    }
  };

  // Apply version validation to all endpoints
  router.use(validateVersion);

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

  const recordParamUrlMetric = (url: string) => async (ctx: Koa.Context, next: () => Promise<void>) => {
    metrics.httpEndpoint(`${prefix}${url}`);
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

  router.get('/', recordMetric, (ctx: Koa.Context) => {
    ctx.body = {
      serviceName: 'falafel',
      isReady: server.isReady(),
    };
    ctx.status = 200;
  });

  router.post('/txs', recordMetric, checkReady, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const postData = JSON.parse((await stream.readAll()) as string);
    const txs = postData.map(fromTxJson);
    const clientIp = requestIp.getClientIp(ctx.request);
    const { origin } = ctx.headers;
    const txRequest: TxRequest = {
      txs,
      requestSender: {
        clientIp: clientIp ?? '',
        originUrl: origin ?? '',
      },
    };
    const txIds = await server.receiveTxs(txRequest);
    const response = {
      txIds: txIds.map(txId => txId.toString('hex')),
    };
    ctx.body = response;
    ctx.status = 200;
  });

  router.post('/txs-second-class', recordMetric, checkReady, validateAuth, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const postData = JSON.parse((await stream.readAll()) as string);
    const txs = postData.map(fromTxJson);
    const clientIp = requestIp.getClientIp(ctx.request);
    const { origin } = ctx.headers;
    const txRequest: TxRequest = {
      txs,
      requestSender: {
        clientIp: clientIp ?? '',
        originUrl: origin ?? '',
      },
    };
    const txIds = await server.receiveTxs(txRequest, true); // secondClass: true
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
    const origin = ctx.header.origin;
    const data = {
      ...log,
      clientIp,
      userAgent,
      origin,
    };
    console.log(`Client log for: ${JSON.stringify(data)}`);
    ctx.status = 200;
  });

  router.post('/client-console-log', async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    // TODO - only allow post from whitelisted domains
    const origin = ctx.header.origin;
    const log = JSON.parse((await stream.readAll()) as string);
    const { publicKeys } = log;
    if (!publicKeys) {
      throw new Error('Invalid client console log.');
    }

    // TODO - reject if submitted in N seconds.
    const clientIp = requestIp.getClientIp(ctx.request);
    const userAgent = ctx.request.header['user-agent'];
    const data = {
      ...log,
      clientIp,
      userAgent,
      origin,
    };
    const timestamp = Date.now();
    const dir = `${configurator.getDataDir()}/client-logs`;
    const publicKey = publicKeys[0] || GrumpkinAddress.ZERO.toString();
    const filename = `${dir}/${publicKey.slice(2, 10)}_${publicKey.slice(-4)}-${clientIp}-${timestamp}`;
    await mkdirp(dir);
    await writeJson(filename, data);
    ctx.status = 200;
  });

  // Insertion of new leaves into the merkle tree is most efficient when done in the "multiples of 2" leaves. For this
  // reason we want to be inserting chunks of 128 leaves when possible. At genesis, the Aztec Connect system didn't
  // start from 0 rollup blocks/leaves but instead from `numInitialSubtreeRoots` leaves (in Aztec Connect production
  // this number is 73). These initial blocks contain aliases from the old system. We expect the SDK to request only
  // `firstTake` amount of blocks upon sync initialization which will ensure that the inefficent insertion happens only
  // once and the following insertions are done in multiples of 128.
  router.get('/get-blocks', recordMetric, checkReady, async (ctx: Koa.Context) => {
    const from = +ctx.query.from!;
    // Throw 400 if `from` is not a number or is negative or `take` is defined but not a number.
    if (isNaN(from) || from < 0 || (ctx.query.take !== undefined && isNaN(+ctx.query.take))) {
      ctx.status = 400;
    } else {
      // Ensure take is between 0 -> 128
      const take = ctx.query.take ? Math.min(Math.max(+ctx.query.take, 0), 128) : 128;
      const blocks = await server.getBlockBuffers(from, take);
      const takeFullfilled = blocks.length === take;

      ctx.body = serializeBufferArrayToVector(blocks);
      ctx.compress = false;
      ctx.status = 200;

      const initialSubtreeRootsLength = server.getInitialWorldState().initialSubtreeRoots.length;
      const firstTake = 128 - (initialSubtreeRootsLength % 128);

      if (takeFullfilled && (((from - firstTake) % 128 === 0 && take === 128) || (from === 0 && take === firstTake))) {
        // Set cache headers to cache the response for 1 year (recommended max value).
        ctx.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  });

  router.get('/latest-rollup-id', recordMetric, async (ctx: Koa.Context) => {
    ctx.body = await server.getLatestRollupId();
    ctx.compress = false;
    ctx.status = 200;
  });

  router.get('/tx/:txId', recordParamUrlMetric('/tx'), async (ctx: Koa.Context) => {
    const { txId } = ctx.params;
    const tx = await server.getTxById(txId);
    if (!tx) {
      ctx.status = 404;
    } else {
      const proofData = new ProofData(tx.proofData);
      const { proofId, publicValue, publicOwner } = proofData;
      const res = {
        id: txId,
        proofId: proofId,
        proofData: tx.proofData.toString('hex'),
        offchainTxData: tx.offchainTxData.toString('hex'),
        newNote1: proofData.noteCommitment1.toString('hex'),
        newNote2: proofData.noteCommitment2.toString('hex'),
        nullifier1: proofData.nullifier1.toString('hex'),
        nullifier2: proofData.nullifier2.toString('hex'),
        publicInput: (proofId === ProofId.DEPOSIT ? publicValue : Buffer.alloc(32)).toString('hex'),
        publicOutput: (proofId === ProofId.WITHDRAW ? publicValue : Buffer.alloc(32)).toString('hex'),
        inputOwner: (proofId === ProofId.DEPOSIT ? publicOwner : Buffer.alloc(32)).toString('hex'),
        block: tx.rollupProof?.rollup,
      };
      ctx.body = res;
      ctx.status = 200;
    }
  });

  router.get('/remove-data', recordMetric, validateAuth, (ctx: Koa.Context) => {
    server.removeData();
    ctx.status = 200;
  });

  router.get('/reset', recordMetric, validateAuth, async (ctx: Koa.Context) => {
    await server.resetPipline();
    ctx.status = 200;
  });

  router.get('/restart', recordMetric, validateAuth, async (ctx: Koa.Context) => {
    await server.restartPipeline();
    ctx.status = 200;
  });

  router.patch('/runtime-config', recordMetric, validateAuth, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const input = (await stream.readAll()) as string;
    const inputJSON = JSON.parse(input);
    const runtimeConfig = partialRuntimeConfigFromJson(inputJSON);
    await server.setRuntimeConfig(runtimeConfig);
    ctx.status = 200;
  });

  router.get('/flush', recordMetric, validateAuth, (ctx: Koa.Context) => {
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
    const txFees = server.getTxFees(assetId);

    ctx.set('content-type', 'application/json');
    ctx.body = txFees.map(fees => fees.map(assetValueToJson));
    ctx.status = 200;
  });

  router.post('/defi-fees', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const data = JSON.parse((await stream.readAll()) as string);
    const bridgeCallData = BigInt(data.bridgeCallData);
    const defiFees = server.getDefiFees(bridgeCallData);

    ctx.set('content-type', 'application/json');
    ctx.body = defiFees.map(assetValueToJson);
    ctx.status = 200;
  });

  router.get('/get-initial-world-state', recordMetric, checkReady, (ctx: Koa.Context) => {
    const response = server.getInitialWorldState();
    ctx.body = initialWorldStateToBuffer(response);
    ctx.status = 200;
  });

  router.post('/bridge-query', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const data = JSON.parse((await stream.readAll()) as string);
    const query = bridgePublishQueryFromJson(data);
    const response = await server.queryBridgeStats(query);
    ctx.set('content-type', 'application/json');
    ctx.body = bridgePublishQueryResultToJson(response);
    ctx.status = 200;
  });

  router.get('/get-pending-txs', recordMetric, async (ctx: Koa.Context) => {
    const txs = await server.getUnsettledTxs();
    ctx.body = txs.map(tx => new ProofData(tx.proofData, tx.id)).map(toPendingTxJson);
    ctx.status = 200;
  });

  router.get('/get-pending-note-nullifiers', recordMetric, async (ctx: Koa.Context) => {
    const nullifiers = await server.getUnsettledNullifiers();
    ctx.body = nullifiers.map(n => n.toString('hex'));
    ctx.status = 200;
  });

  router.post('/is-account-registered', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const data = JSON.parse((await stream.readAll()) as string);
    const accountPublicKey = GrumpkinAddress.fromString(data.accountPublicKey);
    ctx.body = (await server.isAccountRegistered(accountPublicKey)) ? 1 : 0;
    ctx.status = 200;
  });

  router.post('/is-alias-registered', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const { alias } = JSON.parse((await stream.readAll()) as string);
    ctx.body = (await server.isAliasRegistered(alias)) ? 1 : 0;
    ctx.status = 200;
  });

  router.post('/is-alias-registered-to-account', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const data = JSON.parse((await stream.readAll()) as string);
    const accountPublicKey = GrumpkinAddress.fromString(data.accountPublicKey);
    ctx.body = (await server.isAliasRegisteredToAccount(accountPublicKey, data.alias)) ? 1 : 0;
    ctx.status = 200;
  });

  router.get('/get-pending-deposit-txs', recordMetric, async (ctx: Koa.Context) => {
    const txs = await server.getUnsettledDepositTxs();
    ctx.body = txs.map(toDepositTxJson);
    ctx.status = 200;
  });

  router.post('/get-account-registration-rollup-id', recordMetric, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const data = JSON.parse((await stream.readAll()) as string);
    const accountPublicKey = GrumpkinAddress.fromString(data.accountPublicKey);
    const rollupId = await server.getAccountRegistrationRollupId(accountPublicKey);
    ctx.status = 200;
    ctx.body = rollupId === null ? -1 : rollupId;
  });

  router.get('/metrics', recordMetric, async (ctx: Koa.Context) => {
    ctx.body = await metrics.getMetrics();

    // Fetch and forward metrics from sidecar.
    // Means we can easily use prometheus dns_sd_configs to make SRV queries to scrape metrics.
    const sidecarResp = await fetch('http://localhost:9545/metrics').catch(() => undefined);
    if (sidecarResp) {
      ctx.body += await sidecarResp.text();
    }

    ctx.status = 200;
  });

  const app = new Koa();
  app.on('error', error => {
    console.log(`KOA app-level error. ${JSON.stringify({ error })}`);
  });
  app.proxy = true;
  app.use(compress({ br: false } as any));
  app.use(cors());
  app.use(exceptionHandler);
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
