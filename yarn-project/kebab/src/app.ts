import Koa, { Context, DefaultState } from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import compress from 'koa-compress';
import cors from '@koa/cors';
import { Server } from './server.js';

// Not sure why the declaration in koa-bodyparser is not being picked up. Workaround...
// Maybe you, dear reader, can fix and let me (Charlie) know why?
declare module 'koa' {
  interface Request {
    body?: any;
    rawBody: string;
  }
}

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

      if (
        postData?.method?.startsWith('eth_') ||
        server.allowPrivilegedMethods() ||
        server.additionalPermittedMethods().includes(postData?.method)
      ) {
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

  router.post('/:key?', checkReady, auth, async (ctx: Koa.Context) => {
    const { method, params = [], jsonrpc, id } = ctx.request.body;

    if (!server.isValidApiKey(ctx.params.key)) {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorised' };
      return;
    }

    const result = await server.jsonRpc({ method, params });
    ctx.body = { jsonrpc, id, result };
  });

  router.get('/', (ctx: Koa.Context) => {
    const serverConfig = server.getRedeployConfig();
    const redeployConfig = {
      rollupContractAddress: serverConfig.rollupContractAddress?.toString(),
      priceFeedContractAddresses: serverConfig.priceFeedContractAddresses?.map(x => x.toString()).join(','),
      feeDistributorAddress: serverConfig.feeDistributorAddress?.toString(),
      permitHelperAddress: serverConfig.permitHelperContractAddress?.toString(),
      faucetContractAddress: serverConfig.faucetContractAddress?.toString(),
      bridgeDataProviderContractAddress: serverConfig.bridgeDataProviderContractAddress?.toString(),
    };
    ctx.body = {
      serviceName: 'kebab',
      isReady: server.isReady(),
      redeployConfig,
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
