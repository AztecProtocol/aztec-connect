const serve = require('koa-static');
const Koa = require('koa');
const compress = require('koa-compress')

const { PORT = '8080' } = process.env;

new Koa().use(compress()).use(serve('dist')).listen(PORT);

console.log(`Server listening on port ${PORT}`);
