import Koa from 'koa';

export default async function accountWriteValidation(ctx: Koa.Context, next: Function, repo: any) {
  const id = ctx.request.body.id;
  const retrievedData = await repo.findOne({ id });
  if (retrievedData && retrievedData.id === id) {
    ctx.response.status = 403;
    ctx.response.body = 'Fail';
  } else {
    await next();
  }
}
