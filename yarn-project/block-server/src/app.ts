import { fetch } from '@aztec/barretenberg/iso_fetch';
import cors from '@koa/cors';
import Koa, { Context, DefaultState } from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import { Server } from './server.js';

export function appFactory(server: Server, prefix: string) {
  const router = new Router<DefaultState, Context>({ prefix });

  const exceptionHandler = async (ctx: Koa.Context, next: () => Promise<void>) => {
    try {
      await next();
    } catch (err: any) {
      console.log(err);
      ctx.status = 400;
      ctx.body = { error: err.message };
    }
  };

  router.get('/', (ctx: Koa.Context) => {
    ctx.body = {
      serviceName: 'falafel',
      isReady: server.isReady(),
    };
    ctx.status = 200;
  });

  router.get('/get-blocks', (ctx: Koa.Context) => {
    const from = ctx.query.from ? +ctx.query.from : undefined;
    ctx.body = server.getBlockBuffers(from);
    ctx.compress = false;
    ctx.status = 200;
  });

  router.get('/metrics', async (ctx: Koa.Context) => {
    ctx.body = '';

    // Fetch and forward metrics from sidecar.
    // Means we can easily use prometheus dns_sd_configs to make SRV queries to scrape metrics.
    const sidecarResp = await fetch('http://localhost:9545/metrics').catch(() => undefined);
    if (sidecarResp) {
      ctx.body += await sidecarResp.text();
    }

    ctx.status = 200;
  });

  const app = new Koa();
  app.proxy = true;
  app.use(compress({ br: false } as any));
  app.use(cors());
  app.use(exceptionHandler);
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
