import cors from '@koa/cors';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import compress from 'koa-compress';
import Router from 'koa-router';
import { GetHashPathServerResponse, GetHashPathsServerResponse } from './hash_path_source';
import Server from './server';

export function appFactory(server: Server, prefix: string) {
  const router = new Router({ prefix });

  router.get('/get-hash-path/:treeIndex/:index', async (ctx: Koa.Context) => {
    const index = Buffer.from(ctx.params.index, 'hex');
    const treeIndex = +ctx.params.treeIndex;
    const path = await server.getHashPath(treeIndex, index);
    const response: GetHashPathServerResponse = {
      hashPath: path.toBuffer().toString('hex'),
    };
    ctx.set('content-type', 'application/json');
    ctx.body = response;
    ctx.response.status = 200;
  });

  router.post('/get-hash-paths/:treeIndex', async (ctx: Koa.Context) => {
    const nullifierBuffers = ctx.request.body.map((n: string) => Buffer.from(n, 'hex'));
    const treeIndex = +ctx.params.treeIndex;
    const { oldRoot, newRoots, newHashPaths, oldHashPaths } = await server.getHashPaths(treeIndex, nullifierBuffers);

    const response: GetHashPathsServerResponse = {
      oldRoot: oldRoot.toString('hex'),
      newRoots: newRoots.map(r => r.toString('hex')),
      newHashPaths: newHashPaths.map(p => p.toBuffer().toString('hex')),
      oldHashPaths: oldHashPaths.map(p => p.toBuffer().toString('hex')),
    };
    ctx.set('content-type', 'application/json');
    ctx.body = response;
    ctx.response.status = 200;
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
