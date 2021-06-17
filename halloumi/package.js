const package = require('./package.json');
const { writeFileSync } = require('fs');

const { jest, scripts, devDependencies, ...pkg } = package;
pkg.dependencies['@aztec/barretenberg'] = 'file:../../barretenberg.js/dest';
pkg.dependencies['@aztec/blockchain'] = 'file:../../blockchain/dest';
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
