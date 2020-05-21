import Koa from 'koa';
import { keySchema, notesSchema } from '../schemas';

export default async function inputKeyValidation(ctx: Koa.Context, next: Function) {
  await baseInputValidation(keySchema, ctx, next);
}

async function baseInputValidation(schema: any, ctx: Koa.Context, next: Function) {
  const { error } = schema.validate(ctx.request.body);
  if (error) {
    ctx.response.status = 400;
    ctx.response.body = 'Fail';
  } else {
    await next();
  }
}
