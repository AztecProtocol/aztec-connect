const package = require('./package.json');
const { writeFileSync, copyFileSync } = require('fs');

const { jest, devDependencies, ...pkg } = package;

pkg.dependencies.barretenberg = 'file:../../barretenberg.js/dest';
pkg.scripts['deploy:ganache'] = 'buidler run --network ganache scripts/deploy_ganache.js';
pkg.scripts['deploy:ropsten'] = 'buidler run --network ropsten scripts/deploy.js'

writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
copyFileSync('README.md', './dest/README.md');
