const package = require('./package.json');
const { accessSync, copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } = require('fs');

const OUTPUT_PATH = './dist';

// Create package.json.
const { jest, scripts, devDependencies, ...pkg } = package;
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
const recursiveFindFile = (dir, pattern, callback, level = 0) => {
  const relativePath = `${!level ? '.' : Array(level).fill('..').join('/')}`;
  readdirSync(dir).forEach(name => {
    const currentPath = `${dir}/${name}`;
    if (statSync(currentPath).isDirectory()) {
      recursiveFindFile(currentPath, pattern, callback, level + 1);
    } else if (name.match(pattern)) {
      callback(currentPath, relativePath);
    }
  });
};

const ensureDirectory = (dest, dirPaths) => dirPaths.forEach((_, i) => {
  const dirPath = `${dest}/${dirPaths.slice(0, i + 1).join('/')}`;
  try {
    accessSync(dirPath);
  } catch (e) {
    mkdirSync(dirPath);
  }
});
const findAndCopy = (src, dest) => recursiveFindFile(`./node_modules/${src}`, /.d.ts$/, (filePath) => {
  const destPaths = filePath.split('/').slice(2); // remove ./node_modules/
  ensureDirectory(dest, destPaths.slice(0, -1));
  copyFileSync(filePath, `${dest}/${destPaths.join('/')}`);
});
findAndCopy('barretenberg', OUTPUT_PATH);
findAndCopy('blockchain', OUTPUT_PATH);

const updateImportPathInSourceCode = (filename, oldImportPath, importPath) => {
  const sdkCode = readFileSync(filename, 'utf-8')
    .split('\n')
    .map(l =>
      l
        .replace(
          new RegExp(`^(import|export)(.*? from ')${oldImportPath}(.*)`),
          (_, m1, m2, m3) => `${m1}${m2}${importPath}${m3}`,
        )
        .replace(new RegExp(`import\\("${oldImportPath}`), `import("${importPath}`),
    );
  writeFileSync(filename, sdkCode.join('\n'), 'utf-8');
};
const findAndReplace = (dir, moduleName) => recursiveFindFile(dir, /.d.ts$/, (currentPath, relativePath) => {
  updateImportPathInSourceCode(currentPath, moduleName, `${relativePath}/${moduleName}`);
});
findAndReplace(OUTPUT_PATH, 'barretenberg');
findAndReplace(OUTPUT_PATH, 'blockchain');
