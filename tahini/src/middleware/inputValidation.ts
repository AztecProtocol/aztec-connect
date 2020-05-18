import Koa from 'koa';
import { bodySchema } from '../schemas/bodySchema';

export default async function inputValidation(ctx: Koa.Context, next: Function) {
    const { error, value } = bodySchema.validate(ctx.request.body);
    if (error) {
        ctx.response.status = 400;
        ctx.response.body = 'Fail'
    } else {
        await next();
    }
}