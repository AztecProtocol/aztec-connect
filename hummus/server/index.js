/*
  Copyright (c) 2019 xf00f

  This file is part of web3x and is released under the MIT License.
  https://opensource.org/licenses/MIT
*/

const serve = require('koa-static');
const Koa = require('koa');

const { PORT = '8080' } = process.env;

new Koa().use(serve('dist')).listen(PORT);

console.log(`Server listening on port ${PORT}`);
