import Koa from 'koa';
import { inputSchema } from '../schemas';

export default async function inputValidation(ctx: Koa.Context, next: Function) {
    const { error } = inputSchema.validate(ctx.request.body);
    if (error) {
      ctx.response.status = 400;
      ctx.response.body = 'Fail';
    } else {
      await next();
    }
}
