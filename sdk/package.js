const { writeFileSync, copyFileSync } = require('fs');

copyFileSync('README_PUBLISHED.md', './dest/README.md');
copyFileSync('dist/service_worker.js', './dest/service_worker.js');

const package = require('./package.json');
const { jest, scripts, devDependencies, targets, alias, ...pkg } = package;

package.dependencies['@aztec/barretenberg'] = 'file:../../barretenberg.js/dest';
package.dependencies['@aztec/blockchain'] = 'file:../../blockchain/dest';
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
