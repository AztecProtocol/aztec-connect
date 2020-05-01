import Koa from "koa";
import compress from "koa-compress";
import Router from "koa-router";
import { Server } from "./server";
import { PromiseReadable } from 'promise-readable';

const cors = require("@koa/cors");

export function appFactory(server: Server, prefix: string) {
  const router = new Router({ prefix });

  router.get("/", async (ctx: Koa.Context) => {
    ctx.body = "OK\n";
  });

  router.post("/tx", async (ctx: Koa.Context) => {
    try {
      const stream = new PromiseReadable(ctx.req);
      const json = JSON.parse(await stream.readAll() as string);
      const tx = Buffer.from(json, 'hex');
      await server.receiveTx(tx);
      ctx.status = 200;
    } catch (err) {
      console.log(err);
      ctx.body = { error: err.message };
      ctx.status = 400;
    }
  });

  router.get("/get-blocks", async (ctx: Koa.Context) => {
    const blocks = server.getBlocks(+ctx.query['from']);
    ctx.body = blocks.map(({ blockNum, dataStartIndex, dataEntries, nullifiers }) => ({
      blockNum,
      dataStartIndex,
      dataEntries: dataEntries.map(b => b.toString('hex')),
      nullifiers: nullifiers.map(b => b.toString('hex')),
    }));
  });

  router.post("/flush", async (ctx: Koa.Context) => {
    try {
      await server.flushTxs();
      ctx.status = 200;
    } catch (err) {
      console.log(err);
      ctx.body = { error: err.message };
      ctx.status = 400;
    }
  });

  const app = new Koa();
  app.proxy = true;
  app.use(compress());
  app.use(cors());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
