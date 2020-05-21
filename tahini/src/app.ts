// import { Proof } from 'barretenberg/rollup_provider';

import { Connection, Repository, Entity } from 'typeorm';
import { utils } from 'ethers';
import Koa from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

import { Key } from './entity/key';
import { Note } from './entity/Note';

import { inputValidation, accountWriteValidate, validateSignature } from './middleware';
import Server from './server';

const cors = require('@koa/cors');

export function appFactory(server: Server, prefix: string) {
  const router = new Router({ prefix });
  const keyRepo = server.connection.getRepository(Key);
  const noteRepo = server.connection.getRepository(Note);

  router.get('/', async (ctx: Koa.Context) => {
    ctx.body = 'OK\n';
  });


  router.post(
    '/account/new',
    inputValidation,
    (ctx, next) => {
      return accountWriteValidate(ctx, next, keyRepo);
    },
    async (ctx: Koa.Context) => {
      const key = new Key();
      const { id, informationKey } = ctx.request.body;
      key.id = id;
      key.informationKey = informationKey;
      ctx.body = 'OK\n';
      ctx.response.status = 201;
      await keyRepo.save(key);
    },
  );

  router.get('/account/getNotes', validateSignature, async (ctx: Koa.Context) => {
    const retrievedData = await noteRepo.find({ where: {owner: ctx.request.query.id} });
    ctx.body = 'OK\n';
    ctx.response.status = 200;
    ctx.response.body = retrievedData;
  });

  const app = new Koa();
  app.proxy = true;
  app.use(compress());
  app.use(cors());
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
