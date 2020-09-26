const package = require('./package.json');
const { copyFileSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } = require('fs');

const OUTPUT_PATH = './dist';
const OLD_WORKER_NAME = '0.aztec-sdk.web.worker.js';
const WORKER_NAME = 'barretenberg.worker.js';

// Create package.json.
const { jest, scripts, devDependencies, ...pkg } = package;
pkg.name = '@aztec/sdk';
pkg.version = '0.0.1';
pkg.main = 'aztec-sdk.node.js';
pkg.browser = 'aztec-sdk.web.js';
pkg.types = 'index.d.ts';
pkg.files = [WORKER_NAME, 'barretenberg.wasm', '**/*.d.ts'];
delete pkg.dependencies.barretenberg;
delete pkg.dependencies.blockchain;
delete pkg.dependencies.sriracha;
writeFileSync(`${OUTPUT_PATH}/package.json`, JSON.stringify(pkg, null, '  '));

// Copy files.
copyFileSync('README.md', `${OUTPUT_PATH}/README.md`);

// Rename worker.
const updateWorkerNameInSourceCode = filename => {
  const sdkCode = readFileSync(filename, 'utf-8').replace(new RegExp(OLD_WORKER_NAME, 'g'), WORKER_NAME);
  writeFileSync(filename, sdkCode, 'utf-8');
};
(() => {
  updateWorkerNameInSourceCode(`${OUTPUT_PATH}/${pkg.browser}`);
  updateWorkerNameInSourceCode(`${OUTPUT_PATH}/${pkg.browser}.map`);
  updateWorkerNameInSourceCode(`${OUTPUT_PATH}/${OLD_WORKER_NAME}.map`);
  renameSync(`${OUTPUT_PATH}/${OLD_WORKER_NAME}`, `${OUTPUT_PATH}/${WORKER_NAME}`);
  renameSync(`${OUTPUT_PATH}/${OLD_WORKER_NAME}.map`, `${OUTPUT_PATH}/${WORKER_NAME}.map`);
})();

// Change import path to relative path.
const updateImportPathInSourceCode = (filename, oldImportPath, importPath) => {
  const sdkCode = readFileSync(filename, 'utf-8').replace(new RegExp(oldImportPath, 'g'), importPath);
  writeFileSync(filename, sdkCode, 'utf-8');
};
const findAndReplace = (dir, level, moduleName) => {
  const relativePath = `${!level ? '.' : Array(level).fill('..').join('/')}/${moduleName}`;
  readdirSync(dir).forEach(name => {
    if (statSync(`${dir}/${name}`).isDirectory()) {
      findAndReplace(`${dir}/${name}`, level + 1, moduleName);
    } else if (name.match(/.d.ts$/)) {
      updateImportPathInSourceCode(`${dir}/${name}`, moduleName, relativePath);
    }
  });
};
findAndReplace(OUTPUT_PATH, 0, 'barretenberg');
