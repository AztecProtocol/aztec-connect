const package = require('./package.json');
const { writeFileSync, copyFileSync } = require('fs');

const { jest, scripts, devDependencies, ...pkg } = package;

package.dependencies.barretenberg = 'file:../../barretenberg.js/dest';
package.dependencies.blockchain = 'file:../../blockchain/dest';
package.dependencies.sriracha = 'file:../../sriracha/dest';
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));

package.dependencies.barretenberg = 'file:../../barretenberg.js/dest-es';
package.dependencies.blockchain = 'file:../../blockchain/dest-es';
package.dependencies.sriracha = 'file:../../sriracha/dest-es';
writeFileSync('./dest-es/package.json', JSON.stringify(pkg, null, '  '));

copyFileSync('README.md', './dest/README.md');
copyFileSync('README.md', './dest-es/README.md');
