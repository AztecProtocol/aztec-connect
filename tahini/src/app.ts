// import { Proof } from 'barretenberg/rollup_provider';

import { Connection, Repository, Entity } from 'typeorm';
import { utils } from 'ethers';
import Koa from 'koa';
import compress from 'koa-compress';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';

import { Keys } from './entity/Keys';
import { DataEntry } from './entity/DataEntry';
import { Note } from './entity/Note';

import { inputValidation, accountWriteValidate, validateSignature } from './middleware';
import Server from './server';

const cors = require('@koa/cors');

export function appFactory(server: Server, prefix: string) {
  const router = new Router({ prefix });
  const dataEntryRepo = server.connection.getRepository(DataEntry);

  router.get('/', async (ctx: Koa.Context) => {
    ctx.body = 'OK\n';
  });


  router.post(
    '/account/new',
    inputValidation,
    (ctx, next) => {
      return accountWriteValidate(ctx, next, dataEntryRepo);
    },
    async (ctx: Koa.Context) => {
      const { id, notes } = ctx.request.body;
      const dataEntry = new DataEntry();
      dataEntry.id = id;

      // Create the various note entitites
      const notesEntitity: any = await Promise.all(
        notes.map(async (currentNote: Note) => {
          const entity = new Note();
          entity.owner = currentNote.owner;
          entity.viewingKey = currentNote.viewingKey;
          entity.informationKey = currentNote.informationKey;
          return entity;
        }),
      );
    
      dataEntry.notes = notesEntitity;
      ctx.body = 'OK\n';
      ctx.response.status = 201;
      await dataEntryRepo.save(dataEntry);
    },
  );

  router.get('/account/getNotes', validateSignature, async (ctx: Koa.Context) => {
    const retrievedData = await dataEntryRepo.findOne({ where: {id: ctx.request.query.id}, relations: ['notes'] });
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
