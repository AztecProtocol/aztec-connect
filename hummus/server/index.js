const { createReadStream } = require('fs');
const serve = require('koa-static');
const Koa = require('koa');
const compress = require('koa-compress');

const { PORT = '8080' } = process.env;

const app = new Koa();

app.use(compress());

app.use(serve('dist'));

app.use(async ctx => {
  ctx.type = 'html';
  ctx.body = createReadStream('./dist/index.html');
});

app.listen(PORT);

console.log(`Server listening on port ${PORT}`);
