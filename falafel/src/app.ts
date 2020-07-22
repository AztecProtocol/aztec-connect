import { Proof, RollupResponse, TxResponse } from 'barretenberg/rollup_provider';
import Koa from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import { PromiseReadable } from 'promise-readable';
import { RollupDao } from './entity/rollup';
import { TxDao } from './entity/tx';
import { Server } from './server';

const cors = require('@koa/cors');

const toRollupResponse = (rollup: RollupDao): RollupResponse => {
  const { id, status, dataRoot, nullRoot, txs, ethBlock, ethTxHash, created } = rollup;
  return {
    id,
    status,
    dataRoot: dataRoot.toString('hex'),
    nullRoot: nullRoot.toString('hex'),
    txHashes: txs.map(tx => tx.txId.toString('hex')),
    ethBlock,
    ethTxHash: ethTxHash ? ethTxHash.toString('hex') : undefined,
    created,
  };
};

const toTxResponse = (tx: TxDao): TxResponse => {
  const {
    txId,
    rollup,
    merkleRoot,
    newNote1,
    newNote2,
    nullifier1,
    nullifier2,
    publicInput,
    publicOutput,
    created,
  } = tx;
  const linkedRollup = !rollup
    ? undefined
    : {
        id: rollup.id,
        status: rollup.status,
      };
  return {
    txHash: txId.toString('hex'),
    rollup: linkedRollup,
    merkleRoot: merkleRoot.toString('hex'),
    newNote1: newNote1.toString('hex'),
    newNote2: newNote2.toString('hex'),
    nullifier1: nullifier1.toString('hex'),
    nullifier2: nullifier2.toString('hex'),
    publicInput: publicInput.toString('hex'),
    publicOutput: publicOutput.toString('hex'),
    created,
  };
};

export function appFactory(server: Server, prefix: string) {
  const router = new Router({ prefix });

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
      const txId = await server.receiveTx(tx);
      ctx.status = 200;
      ctx.body = { txId: txId.toString('hex') };
    } catch (err) {
      console.log(err);
      ctx.status = 400;
      ctx.body = { error: err.message };
    }
  });

  router.get('/get-blocks', async (ctx: Koa.Context) => {
    const blocks = await server.getBlocks(+ctx.query.from);
    ctx.body = blocks.map(({ dataEntries, nullifiers, viewingKeys, ...rest }) => ({
      ...rest,
      dataEntries: dataEntries.map(b => b.toString('hex')),
      nullifiers: nullifiers.map(b => b.toString('hex')),
      viewingKeys: viewingKeys.map(b => b.toString('hex')),
    }));
  });

  router.get('/get-rollups', async (ctx: Koa.Context) => {
    try {
      const rollups = await server.getLatestRollups(+ctx.query.count);
      ctx.status = 200;
      ctx.body = rollups.map(rollup => toRollupResponse(rollup));
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
      ctx.body = txs.map(tx => toTxResponse(tx));
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

  const app = new Koa();
  app.proxy = true;
  app.use(compress());
  app.use(cors());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
