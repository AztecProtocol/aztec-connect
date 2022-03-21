const package = require('./package.json');
const { writeFileSync, copyFileSync, copySync } = require('fs-extra');

const { jest, scripts, devDependencies, ...pkg } = package;
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
copyFileSync('./src/wasm/barretenberg.wasm', './dest/wasm/barretenberg.wasm');
copyFileSync('README.md', './dest/README.md');
copySync('./src/environment/init/data', './dest/environment/init/data', { overwrite: true });
