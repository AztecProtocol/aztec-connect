import Koa from "koa";
import compress from "koa-compress";
import Router from "koa-router";
import { Server } from "./server";
import { JoinSplitTx } from "../../barretenberg.js/src/client_proofs/join_split_proof/join_split_tx";
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
      let tx = await stream.readAll() as Buffer;
      await server.receiveTx(tx);
      ctx.status = 200;
    } catch (err) {
      console.log(err);
      ctx.body = { error: err.message };
      ctx.status = 400;
    }
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
