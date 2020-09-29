import cors from '@koa/cors';
import { RollupProviderStatusServerResponse } from 'barretenberg/rollup_provider';
import { toBigIntBE } from 'bigint-buffer';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import compress from 'koa-compress';
import Router from 'koa-router';
import { GetHashPathServerResponse, GetHashPathsServerResponse, GetTreeStateServerResponse } from './hash_path_source';
import Server from './server';

export function appFactory(server: Server, prefix: string) {
  const router = new Router({ prefix });

  router.get('/status', async (ctx: Koa.Context) => {
    const status = await server.status();
    const { rollupContractAddress, tokenContractAddress, dataRoot, nullRoot } = status;
    const response: RollupProviderStatusServerResponse = {
      ...status,
      rollupContractAddress: rollupContractAddress.toString(),
      tokenContractAddress: tokenContractAddress.toString(),
      dataRoot: dataRoot.toString('hex'),
      nullRoot: nullRoot.toString('hex'),
    };
    ctx.set('content-type', 'application/json');
    ctx.body = response;
    ctx.response.status = 200;
  });

  router.get('/get-tree-state/:treeIndex', async (ctx: Koa.Context) => {
    const treeIndex = +ctx.params.treeIndex;
    const { size, root } = await server.getTreeState(treeIndex);
    const response: GetTreeStateServerResponse = {
      root: root.toString('hex'),
      size: size.toString(),
    };
    ctx.set('content-type', 'application/json');
    ctx.body = response;
    ctx.response.status = 200;
  });

  router.get('/get-hash-path/:treeIndex/:index', async (ctx: Koa.Context) => {
    const index = BigInt(ctx.params.index);
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
    const additions = ctx.request.body.map((addition: any) => {
      return { index: toBigIntBE(Buffer.from(addition.index, 'hex')), value: Buffer.from(addition.value, 'hex') };
    });
    const treeIndex = +ctx.params.treeIndex;
    const { oldRoot, newRoots, newHashPaths, oldHashPaths } = await server.getHashPaths(treeIndex, additions);

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
