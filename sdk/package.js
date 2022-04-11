const { writeFileSync, copyFileSync, renameSync } = require('fs');

copyFileSync('README_PUBLISHED.md', './dest/README.md');

const commitTag = process.env.COMMIT_TAG;
const sharedWorkerFilename = `shared_worker${commitTag ? `.${commitTag}` : ''}.js`;
if (commitTag) {
  renameSync('./dist/shared_worker.js', `./dist/${sharedWorkerFilename}`);
}
copyFileSync(`./dist/${sharedWorkerFilename}`, `./dest/${sharedWorkerFilename}`);

const package = require('./package.json');
const { jest, scripts, devDependencies, targets, alias, ...pkg } = package;

package.dependencies['@aztec/barretenberg'] = 'file:../../barretenberg.js/dest';
package.dependencies['@aztec/blockchain'] = 'file:../../blockchain/dest';
writeFileSync('./dest/package.json', JSON.stringify(pkg, null, '  '));
