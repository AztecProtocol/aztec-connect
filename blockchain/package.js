const { writeFileSync, copyFileSync, mkdirSync } = require('fs');

mkdirSync('./dest', { recursive: true });
copyFileSync('README.md', './dest/README.md');

const package = require('./package.json');
const { jest, devDependencies, ...pkg } = package;

pkg.dependencies['@aztec/barretenberg'] = 'file:../../barretenberg.js/dest';
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
