import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import compress from 'koa-compress';
import Router from 'koa-router';

import { Key } from './entity/key';
import { Note } from './entity/Note';

import { accountWriteValidate, inputValidation, validateSignature } from './middleware';
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
    '/POST/account/new',
    inputValidation,
    (ctx, next) => {
      return validateSignature(ctx, next, server.schnorr);
    },
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

      // notify server of new key
      await server.registerNewKey(key);
    },
  );

  router.post(
    '/POST/account/key',
    (ctx, next) => {
      return validateSignature(ctx, next, server.schnorr);
    },
    async (ctx: Koa.Context) => {
      const { id, newInformationKey } = ctx.request.body;
      const userKey = await keyRepo.find({ where: { id } });
      userKey[0].informationKey = newInformationKey;

      ctx.body = 'OK\n';
      ctx.response.status = 200;

      await keyRepo.save(userKey[0]);
    },
  );

  // TODO: change this to GET and use query params or header
  router.post(
    '/GET/account/notes',
    (ctx, next) => {
      return validateSignature(ctx, next, server.schnorr);
    },
    async (ctx: Koa.Context) => {
      const retrievedData = await noteRepo.find({ where: { owner: ctx.request.body.id } });
      ctx.body = 'OK\n';
      ctx.response.status = 200;
      ctx.response.body = retrievedData;
    },
  );

  const app = new Koa();
  app.proxy = true;
  app.use(compress());
  app.use(cors());
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
