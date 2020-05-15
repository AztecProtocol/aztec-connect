import { Proof } from 'barretenberg/rollup_provider';
import Koa from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import { PromiseReadable } from 'promise-readable';
import { Server } from './server';

const cors = require('@koa/cors');

export function appFactory(server: Server, prefix: string) {
  const router = new Router({ prefix });

  router.get('/', async (ctx: Koa.Context) => {
    ctx.body = 'OK\n';
  });

  router.post('/tx', async (ctx: Koa.Context) => {
    try {
      const stream = new PromiseReadable(ctx.req);
      const { proofData, encViewingKey1, encViewingKey2 } = JSON.parse((await stream.readAll()) as string);
      const tx: Proof = {
        proofData: Buffer.from(proofData, 'hex'),
        encViewingKey1: Buffer.from(encViewingKey1, 'hex'),
        encViewingKey2: Buffer.from(encViewingKey2, 'hex'),
      };
      await server.receiveTx(tx);
      ctx.status = 200;
    } catch (err) {
      console.log(err);
      ctx.body = { error: err.message };
      ctx.status = 400;
    }
  });

  router.get('/get-blocks', async (ctx: Koa.Context) => {
    const blocks = server.getBlocks(+ctx.query.from);
    ctx.body = blocks.map(({ dataEntries, nullifiers, viewingKeys, ...rest }) => ({
      ...rest,
      dataEntries: dataEntries.map(b => b.toString('hex')),
      nullifiers: nullifiers.map(b => b.toString('hex')),
      viewingKeys: viewingKeys.map(b => b.toString('hex')),
    }));
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
    ctx.body = server.status();
  });

  const app = new Koa();
  app.proxy = true;
  app.use(compress());
  app.use(cors());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
