/*
  This file is part of web3x.

  web3x is free software: you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  web3x is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with web3x.  If not, see <http://www.gnu.org/licenses/>.
*/

const package = require('./package.json');
const { writeFileSync, copyFileSync } = require('fs');

const { jest, scripts, devDependencies, ...pkg } = package;
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
writeFileSync('./dest-es/package.json', JSON.stringify({ ...pkg, name: `${pkg.name}-es` }, null, '  '));
copyFileSync('./src/wasm/barretenberg.wasm', './dest/wasm/barretenberg.wasm');
copyFileSync('./src/wasm/barretenberg.wasm', './dest-es/wasm/barretenberg.wasm');
copyFileSync('README.md', './dest/README.md');
copyFileSync('README.md', './dest-es/README.md');
