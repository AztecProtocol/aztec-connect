import Koa from 'koa';
import Router from 'koa-router';
import { PromiseReadable } from 'promise-readable';
import { DefaultState, Context } from 'koa';
import { Server } from './server';

export function appFactory(server: Server, prefix: string) {
  const router = new Router<DefaultState, Context>({ prefix });

  const checkReady = async (ctx: Koa.Context, next: () => Promise<void>) => {
    if (!server.isReady()) {
      ctx.status = 503;
      ctx.body = { error: 'Server not ready.' };
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
      serviceName: 'halloumi',
      isReady: server.isReady(),
    };
    ctx.status = 200;
  });

  router.post('/create-proof', checkReady, async (ctx: Koa.Context) => {
    const stream = new PromiseReadable(ctx.req);
    const data = (await stream.readAll()) as Buffer;
    const response = await server.createProof(data);
    ctx.body = response;
    ctx.status = 200;
  });

  // router.post('/create-root-rollup', checkReady, async (ctx: Koa.Context) => {
  //   const stream = new PromiseReadable(ctx.req);
  //   const data = (await stream.readAll()) as Buffer;
  //   const response = await server.createRootRollup(data);
  //   ctx.body = response;
  //   ctx.status = 200;
  // });

  router.get('/get-join-split-vk', async (ctx: Koa.Context) => {
    const response = await server.getJoinSplitVerificationKey();
    ctx.body = response;
    ctx.status = 200;
  });

  router.get('/get-account-vk', async (ctx: Koa.Context) => {
    const response = await server.getAccountVerificationKey();
    ctx.body = response;
    ctx.status = 200;
  });

  router.get('/reset', async (ctx: Koa.Context) => {
    await server.reset();
    ctx.status = 200;
  });

  const app = new Koa();
  app.proxy = true;
  app.use(exceptionHandler);
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
