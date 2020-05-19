// import { Proof } from 'barretenberg/rollup_provider';

import { Connection, Repository } from 'typeorm';
import { utils } from 'ethers';
import Koa from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

import { Key } from './entity/key';
import { Note } from './entity/note';


import { inputKeyValidation, inputNoteValidation, accountWriteValidate } from './middleware';
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
    inputKeyValidation,
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

  router.get('/account/:accountId/key', async (ctx: Koa.Context) => {
    const { id, signature, message } = ctx.request.query;
    const recoveredAddress = utils.verifyMessage(message, signature).slice(2);
    const retrievedKey = await keyRepo.findOne({ id });

    if (retrievedKey && id === recoveredAddress) {
      ctx.body = 'OK\n';
      ctx.response.status = 200;
      ctx.response.body = retrievedKey;
    } else {
      ctx.response.status = 401;
      ctx.response.body = 'Fail';
    }
  });

  router.post(
    '/account/:accountID/notes',
    inputNoteValidation,
    (ctx, next) => {
      return accountWriteValidate(ctx, next, noteRepo);
    },
    async (ctx: Koa.Context) => {
      const { note } = ctx.request.body;
      const { id, owner, viewingKey } = note;
      const noteEntity = new Note();
      noteEntity.id = id;
      noteEntity.owner = owner;
      noteEntity.viewingKey = viewingKey;

      ctx.body = 'OK\n';
      ctx.response.status = 201;
      await noteRepo.save(note);
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
