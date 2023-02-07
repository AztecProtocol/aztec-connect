import Koa, { Context, DefaultState } from 'koa';
import Router from 'koa-router';
import compress from 'koa-compress';
import bodyParser from 'koa-bodyparser';

import { Server } from './server.js';

export function appFactory(server: Server) {
  const app = new Koa();
  const router = new Router<DefaultState, Context>();

  const checkReady = async (ctx: Context, next: () => Promise<void>) => {
    if (!server.isReady()) {
      ctx.status = 503;
      ctx.body = { error: 'Nym gateway not ready. Try again later.' };
    } else {
      await next();
    }
  };

  const exceptionHandler = async (ctx: Context, next: () => Promise<void>) => {
    try {
      await next();
    } catch (err: any) {
      console.log(err);
      ctx.status = 400;
      ctx.body = { error: err.message };
    }
  };

  router.get('/', (ctx: Context) => {
    ctx.status = 200;
    ctx.body = {
      isReady: server.isReady(),
      serviceName: 'nym-gateway',
    };
  });

  router.get('/status', checkReady, (ctx: Context) => {
    const nymAddress = server.getAddress();
    const isReady = server.isReady();
    ctx.status = 200;
    ctx.body = {
      nymAddress,
      isReady,
    };
  });

  router.get('/metrics', async (ctx: Koa.Context) => {
    ctx.body = '';

    // Fetch and forward metrics from sidecar.
    const sidecarResp = await fetch('http://localhost:9545/metrics').catch(() => undefined);
    if (sidecarResp) {
      ctx.body += await sidecarResp.text();
    }

    ctx.status = 200;
  });

  app.use(compress({ br: false } as any));
  app.use(bodyParser());
  app.use(exceptionHandler);
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
