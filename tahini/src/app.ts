// import { Proof } from 'barretenberg/rollup_provider';

import { Connection, Repository } from 'typeorm';
import { utils } from 'ethers';
import Koa from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

import { Keys } from './entity/Keys';
import { Notes } from './entity/Notes';

import { inputKeyValidation, inputNoteValidation, accountWriteValidate, validateSignature } from './middleware';
import Server from './server';

const cors = require('@koa/cors');

export function appFactory(server: Server, prefix: string) {
  const router = new Router({ prefix });
  const keyRepo = server.connection.getRepository(Keys);
  const noteRepo = server.connection.getRepository(Notes);

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
      const key = new Keys();
      const { id, informationKeys } = ctx.request.body;
      key.id = id;
      key.informationKeys = informationKeys;
      ctx.body = 'OK\n';
      ctx.response.status = 201;
      await keyRepo.save(key);
    },
  );

  router.get('/account/:accountId/getKeys', validateSignature, async (ctx: Koa.Context) => {
    const retrievedKey = await keyRepo.findOne({ id: ctx.request.query.id });
    ctx.body = 'OK\n';
    ctx.response.status = 200;
    ctx.response.body = retrievedKey;
  });

  router.post(
    '/account/:accountID/newNotes',
    // inputNoteValidation,
    (ctx, next) => {
      return accountWriteValidate(ctx, next, noteRepo);
    },
    async (ctx: Koa.Context) => {
      const { id, notes } = ctx.request.body;
      console.log({ id });
      console.log({ notes });
      const notesEntity = new Notes();
      notesEntity.id = id;
      notesEntity.notes = notes;
      console.log({ notesEntity });

      ctx.body = 'OK\n';
      ctx.response.status = 201;
      console.log('before save notes')
      await noteRepo.save(notesEntity);
    },
  );

  router.get('/account/:accountId/getNotes', validateSignature, async (ctx: Koa.Context) => {
    const retrievedNotes = await noteRepo.findOne({ id: ctx.request.query.id });
    ctx.body = 'OK\n';
    ctx.response.status = 200;
    ctx.response.body = retrievedNotes;
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
