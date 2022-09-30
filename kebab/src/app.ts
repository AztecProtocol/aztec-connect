import Koa, { Context, DefaultState } from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import compress from 'koa-compress';
import cors from '@koa/cors';

import { EthRequestArguments, Server } from './server';
import { DEFI_BRIDGE_EVENT_TOPIC, ROLLUP_PROCESSED_EVENT_TOPIC } from './rollup_event_getter';

export function appFactory(server: Server, prefix: string) {
  const router = new Router<DefaultState, Context>({ prefix });

  const checkReady = async (ctx: Koa.Context, next: () => Promise<void>) => {
    if (!server.isReady()) {
      ctx.status = 503;
      ctx.body = { error: 'Server not ready. Try again later.' };
    } else {
      await next();
    }
  };

  const auth = async (ctx: Koa.Context, next: () => Promise<void>) => {
    if (ctx.method === 'POST') {
      const { body: postData } = ctx.request;

      if (postData?.method?.startsWith('eth_') || server.allowPrivilegedMethods()) {
        await next();
      }
    } else {
      ctx.status = 400;
      ctx.body = { error: 'Invalid request sent to Kebab RPC server' };
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

  router.post('/', checkReady, auth, async (ctx: Koa.Context) => {
    const { method, params = [], jsonrpc, id } = ctx.request.body as EthRequestArguments;
    let result;
    if (
      server.isReady() &&
      method?.startsWith('eth_getLogs') &&
      params[0].topics?.length &&
      [ROLLUP_PROCESSED_EVENT_TOPIC, DEFI_BRIDGE_EVENT_TOPIC].includes(params[0].topics[0])
    ) {
      // do the work
      result = await server.queryLogs(params[0]);
    } else {
      // forward to geth node
      result = await server.forwardEthRequest(ctx.request.body);
    }
    ctx.body = { jsonrpc, id, result };
  });

  router.get('/', (ctx: Koa.Context) => {
    ctx.body = {
      serviceName: 'kebab',
      isReady: server.isReady(),
    };
    ctx.status = 200;
  });

  const app = new Koa();
  app.proxy = true;

  app.use(compress({ br: false } as any));
  app.use(bodyParser());
  app.use(cors());
  app.use(exceptionHandler);
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
