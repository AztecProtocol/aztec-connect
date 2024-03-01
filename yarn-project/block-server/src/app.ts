import { fetch } from '@aztec/barretenberg/iso_fetch';
import cors from '@koa/cors';
import Koa, { Context, DefaultState } from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import proxy from 'koa-proxy';
import { Server } from './server.js';

export function appFactory(server: Server, falafelUrl: URL, prefix: string) {
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

  // An endpoint informing whether the server is ready to serve requests.
  router.get('/', (ctx: Koa.Context) => {
    ctx.body = {
      serviceName: 'block-server',
      isReady: server.isReady(),
    };
    ctx.status = 200;
  });

  // Insertion of new leaves into the merkle tree is most efficient when done in the "multiples of 2" leaves. For this
  // reason we want to be inserting chunks of 128 leaves when possible. At genesis, the Aztec Connect system didn't
  // start from 0 rollup blocks/leaves but instead from `numInitialSubtreeRoots` leaves (in Aztec Connect production
  // this number is 73). These initial blocks contain aliases from the old system. We expect the SDK to request only
  // `firstTake` amount of blocks upon sync initialization which will ensure that the inefficient insertion happens only
  // once and the following insertions are done in multiples of 128.
  router.get('/get-blocks', async (ctx: Koa.Context) => {
    if (!server.isReady()) {
      ctx.status = 503;
      return;
    }
    const from = +ctx.query.from!;
    // Throw 400 if `from` is not a number or is negative or `take` is defined but not a number.
    if (isNaN(from) || from < 0 || (ctx.query.take !== undefined && isNaN(+ctx.query.take))) {
      ctx.status = 400;
    } else {
      // Ensure take is between 0 -> 128
      const take = ctx.query.take ? Math.min(Math.max(+ctx.query.take, 0), 128) : 128;
      const [blocksBuffer, takeFullfilled] = await server.getBlockBuffers(from, take);
      ctx.body = blocksBuffer;
      ctx.compress = false;
      ctx.status = 200;
      const numInitialSubtreeRoots = await server.getNumInitialSubtreeRoots();
      const firstTake = 128 - (numInitialSubtreeRoots % 128);
      if (takeFullfilled && (((from - firstTake) % 128 === 0 && take === 128) || (from === 0 && take === firstTake))) {
        // Set cache headers to cache the response for 1 year (recommended max value).
        ctx.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  });

  // An endpoint which returns an id of the rollup/block up to which the server has synced.
  router.get('/latest-rollup-id', (ctx: Koa.Context) => {
    ctx.body = server.getLatestRollupId();
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
  app.on('error', error => {
    console.log(`KOA app-level error. ${JSON.stringify({ error })}`);
  });
  app.proxy = true;
  app.use(compress({ br: false } as any));
  app.use(cors());
  app.use(exceptionHandler);
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(proxy({ host: falafelUrl.origin }));

  return app;
}
