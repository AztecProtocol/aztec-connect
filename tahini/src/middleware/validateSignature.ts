import { utils } from 'ethers';
import Koa from 'koa';

export default async function validateSignature(ctx: Koa.Context, next: Function) {
  const { id, signature, message } = ctx.request.query;
  const recoveredAddress = utils.verifyMessage(message, signature).slice(2);

  if (recoveredAddress !== id) {
    ctx.response.status = 401;
    ctx.response.body = 'Fail';
  } else {
    await next();
  }
}
