const package = require('./package.json');
const { writeFileSync, copyFileSync } = require('fs');

const { jest, scripts, devDependencies, ...pkg } = package;
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
writeFileSync('./dest-es/package.json', JSON.stringify(pkg, null, '  '));
copyFileSync('./src/wasm/barretenberg.wasm', './dest/wasm/barretenberg.wasm');
copyFileSync('./src/wasm/barretenberg.wasm', './dest-es/wasm/barretenberg.wasm');
copyFileSync('README.md', './dest/README.md');
copyFileSync('README.md', './dest-es/README.md');
