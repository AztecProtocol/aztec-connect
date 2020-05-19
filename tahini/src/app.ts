// import { Proof } from 'barretenberg/rollup_provider';

import { Connection, Repository } from 'typeorm';
import { utils } from 'ethers';
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

  // Get information from the database
  router.get('/', async (ctx: Koa.Context) => {
    ctx.body = 'OK\n';
  });

  // Create a new entry in the database
  router.post('/account/new', inputValidation, async (ctx: Koa.Context) => {
    const key = new Key();
    const { id, informationKey } = ctx.request.body;
    key.id = id;
    key.informationKey = informationKey;

    // check if ID has already been written to
    const retrievedData = await keyRepo.findOne({ id });
    if (retrievedData && retrievedData.id === id) {
      ctx.response.status = 403;
      ctx.response.body = 'Fail';
    } else {
      ctx.body = 'OK\n';
      ctx.response.status = 201;
      await keyRepo.save(key);
    }
  });

  // TODO: work out how to do with query params on a GET rather than POST
  // use middleware to check condition
  router.get('/account/fetchKey', async (ctx: Koa.Context) => {
    const { id, signature, message } = ctx.request.query;
    const recoveredAddress = utils.verifyMessage(message, signature).slice(2);
    const retrievedKey = await keyRepo.findOne({ id });
    

    if (retrievedKey && id === recoveredAddress) {
        ctx.body = 'OK\n';
        ctx.response.status = 200;
        ctx.response.body = retrievedKey
    } else {
        ctx.response.status = 401;
        ctx.response.body = 'Fail'
    }
  });

    // TODO: work out how to do with query params on a GET rather than POST
  // use middleware to check condition
  router.post('/account/notes', async (ctx: Koa.Context) => {
    
    // const retrievedKey = await keyRepo.findOne({ id });

    // if (retrievedKey && id === recoveredAddress) {
    //     ctx.body = 'OK\n';
    //     ctx.response.status = 200;
    //     ctx.response.body = retrievedKey
    // } else {
    //     ctx.response.status = 401;
    //     ctx.response.body = 'Fail'
    // }
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
