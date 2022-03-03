const { writeFileSync, copyFileSync } = require('fs');

copyFileSync('README.md', './dest/README.md');

const package = require('./package.json');
const { jest, scripts, devDependencies, ...pkg } = package;

package.dependencies['@aztec/barretenberg'] = 'file:../../barretenberg.js/dest';
package.dependencies['@aztec/blockchain'] = 'file:../../blockchain/dest';
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
