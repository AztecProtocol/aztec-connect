import { utils } from 'ethers';
import Koa from 'koa';
import { Schnorr } from 'barretenberg/crypto/schnorr';
import * as encoding from 'text-encoding';

export default async function validateSignature(ctx: Koa.Context, next: Function, schnorr: Schnorr) {
  let id: any;
  let signature: any;
  let message: any;

  ({ id, signature, message } = ctx.request.body);
  signature.s = Buffer.from(signature.s.data);
  signature.e = Buffer.from(signature.e.data);

  const valid = schnorr.verifySignature(new encoding.TextEncoder().encode(message), Buffer.from(id, 'hex'), signature);
  if (!valid) {
    ctx.response.status = 401;
    ctx.response.body = 'Fail';
  } else {
    await next();
  }
}
