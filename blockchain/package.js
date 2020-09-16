const package = require('./package.json');
const { writeFileSync, copyFileSync } = require('fs');

const { jest, devDependencies, ...pkg } = package;
pkg.dependencies.barretenberg = 'file:../../barretenberg.js/dest';
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
copyFileSync('README.md', './dest/README.md');
