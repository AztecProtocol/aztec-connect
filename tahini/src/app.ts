// import { Proof } from 'barretenberg/rollup_provider';
import Koa from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';

const cors = require('@koa/cors');

export function appFactory(prefix: string) {
  const router = new Router({ prefix });

  router.get('/', async (ctx: Koa.Context) => {
    ctx.body = 'OK\n';
  });

  router.post('/account/new', async (ctx: Koa.Context) => {
      ctx.body = 'OK\n';
      ctx.response.status = 201;
  });

  router.get('/account/:reference', async (ctx: Koa.Context) => {

  });

  const app = new Koa();
  app.proxy = true;
  app.use(compress());
  app.use(cors());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
