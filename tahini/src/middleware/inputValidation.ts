import Koa from 'koa';
import { keySchema, noteSchema } from '../schemas';

export async function inputNoteValidation(ctx: Koa.Context, next: Function) {
  await baseInputValidation(noteSchema, ctx, next);
}

export async function inputKeyValidation(ctx: Koa.Context, next: Function) {
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
