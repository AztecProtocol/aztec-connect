// import { Proof } from 'barretenberg/rollup_provider';

import { Connection, Repository } from 'typeorm';
import Koa from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

import { Key } from './entity/key';
import inputValidation from './middleware/inputValidation';
import Server from './server';

const cors = require('@koa/cors');

export function appFactory(server: Server, prefix: string) {
  const router = new Router({ prefix });
  const keyRepo = server.connection.getRepository(Key);

  router.get('/', async (ctx: Koa.Context) => {
    ctx.body = 'OK\n';
  });

  router.post('/account/new', inputValidation, async (ctx: Koa.Context) => {
    ctx.body = 'OK\n';
    ctx.response.status = 201;

    const key = new Key();
    const { id, informationKey } = ctx.request.body;
    key.id = id;
    key.informationKey = informationKey;

    // check if ID has only been written
    const retrievedData = await keyRepo.findOne({ id });
    if (retrievedData && retrievedData.id === id) {
        ctx.response.status = 403;
        ctx.response.body = 'Fail';
    }

    await keyRepo.save(key);
  });

  router.get('/account/:reference', async (ctx: Koa.Context) => {});

  const app = new Koa();
  app.proxy = true;
  app.use(compress());
  app.use(cors());
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
