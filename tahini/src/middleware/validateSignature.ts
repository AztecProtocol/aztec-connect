import { utils } from 'ethers';
import Koa from 'koa';
import { Schnorr } from 'barretenberg/crypto/schnorr';

export default async function validateSignature(ctx: Koa.Context, next: Function, schnorr: Schnorr) {
  const { id, signature, message } = ctx.request.query;
  const valid = schnorr.verifySignature(message, id, signature);
  
  if (valid) {
    ctx.response.status = 401;
    ctx.response.body = 'Fail';
  } else {
    await next();
  }
}
