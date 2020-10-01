const package = require('./package.json');
const { copyFileSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } = require('fs');

const OUTPUT_PATH = './dist';

// Create package.json.
const { jest, scripts, devDependencies, ...pkg } = package;
pkg.name = '@aztec/sdk';
pkg.main = 'aztec-sdk.node.js';
pkg.browser = 'aztec-sdk.web.js';
pkg.types = 'index.d.ts';
delete pkg.dependencies.barretenberg;
delete pkg.dependencies.blockchain;
delete pkg.dependencies.sriracha;
writeFileSync(`${OUTPUT_PATH}/package.json`, JSON.stringify(pkg, null, '  '));

// Copy files.
copyFileSync('README.md', `${OUTPUT_PATH}/README.md`);

// Temporary until we no longer expose barretenberg types through the sdk.
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
