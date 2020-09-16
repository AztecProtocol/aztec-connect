const package = require('./package.json');
const { writeFileSync } = require('fs');

const { jest, scripts, devDependencies, ...pkg } = package;
package.dependencies.barretenberg = 'file:../../barretenberg.js/dest';
package.dependencies.blockchain = 'file:../../blockchain/dest';
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
// copyFileSync('README.md', './dest/README.md');
