"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const path = require('path');

const commandExists = require('command-exists');

const childProcess = require('child_process');

const _require = require('@parcel/utils'),
      promisify = _require.promisify;

const exec = promisify(childProcess.execFile);

const toml = require('@iarna/toml');

const fs = require('@parcel/fs');

const Asset = require('../Asset');

const config = require('../utils/config');

const pipeSpawn = require('../utils/pipeSpawn');

const md5 = require('../utils/md5');

const RUST_TARGET = 'wasm32-unknown-unknown';
const MAIN_FILES = ['src/lib.rs', 'src/main.rs']; // Track installation status so we don't need to check more than once

let rustInstalled = false;

class RustAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'wasm';
  }

  process() {
    // We don't want to process this asset if the worker is in a warm up phase
    // since the asset will also be processed by the main process, which
    // may cause errors since rust writes to the filesystem.
    if (this.options.isWarmUp) {
      return;
    }

    return super.process();
  }

  parse() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // Install rust toolchain and target if needed
      yield _this.installRust(); // See if there is a Cargo config in the project

      let cargoConfig = yield _this.getConfig(['Cargo.toml']);
      let cargoDir;
      let isMainFile = false;

      if (cargoConfig) {
        const mainFiles = MAIN_FILES.slice();

        if (cargoConfig.lib && cargoConfig.lib.path) {
          mainFiles.push(cargoConfig.lib.path);
        }

        cargoDir = path.dirname(yield config.resolve(_this.name, ['Cargo.toml']));
        isMainFile = mainFiles.some(file => path.join(cargoDir, file) === _this.name);
      } // If this is the main file of a Cargo build, use the cargo command to compile.
      // Otherwise, use rustc directly.


      if (isMainFile) {
        yield _this.cargoBuild(cargoConfig, cargoDir);
      } else {
        yield _this.rustcBuild();
      }
    })();
  }

  installRust() {
    return (0, _asyncToGenerator2.default)(function* () {
      if (rustInstalled) {
        return;
      } // Check for rustup


      try {
        yield commandExists('rustup');
      } catch (e) {
        throw new Error("Rust isn't installed. Visit https://www.rustup.rs/ for more info");
      } // Ensure nightly toolchain is installed


      let _yield$exec = yield exec('rustup', ['show']),
          _yield$exec2 = (0, _slicedToArray2.default)(_yield$exec, 1),
          stdout = _yield$exec2[0];

      if (!stdout.includes('nightly')) {
        yield pipeSpawn('rustup', ['update']);
        yield pipeSpawn('rustup', ['toolchain', 'install', 'nightly']);
      } // Ensure wasm target is installed


      var _yield$exec3 = yield exec('rustup', ['target', 'list', '--toolchain', 'nightly']);

      var _yield$exec4 = (0, _slicedToArray2.default)(_yield$exec3, 1);

      stdout = _yield$exec4[0];

      if (!stdout.includes(RUST_TARGET + ' (installed)')) {
        yield pipeSpawn('rustup', ['target', 'add', RUST_TARGET, '--toolchain', 'nightly']);
      }

      rustInstalled = true;
    })();
  }

  cargoBuild(cargoConfig, cargoDir) {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // Ensure the cargo config has cdylib as the crate-type
      if (!cargoConfig.lib) {
        cargoConfig.lib = {};
      }

      if (!Array.isArray(cargoConfig.lib['crate-type'])) {
        cargoConfig.lib['crate-type'] = [];
      }

      if (!cargoConfig.lib['crate-type'].includes('cdylib')) {
        cargoConfig.lib['crate-type'].push('cdylib');
        yield fs.writeFile(path.join(cargoDir, 'Cargo.toml'), toml.stringify(cargoConfig));
      } // Run cargo


      let args = ['+nightly', 'build', '--target', RUST_TARGET, '--release'];
      yield exec('cargo', args, {
        cwd: cargoDir
      }); // Get output file paths

      let _yield$exec5 = yield exec('cargo', ['metadata', '--format-version', '1'], {
        cwd: cargoDir
      }),
          _yield$exec6 = (0, _slicedToArray2.default)(_yield$exec5, 1),
          stdout = _yield$exec6[0];

      const cargoMetadata = JSON.parse(stdout);
      const cargoTargetDir = cargoMetadata.target_directory;
      let outDir = path.join(cargoTargetDir, RUST_TARGET, 'release'); // Rust converts '-' to '_' when outputting files.

      let rustName = cargoConfig.package.name.replace(/-/g, '_');
      _this2.wasmPath = path.join(outDir, rustName + '.wasm');
      _this2.depsPath = path.join(outDir, rustName + '.d');
    })();
  }

  rustcBuild() {
    var _this3 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // Get output filename
      yield fs.mkdirp(_this3.options.cacheDir);
      let name = md5(_this3.name);
      _this3.wasmPath = path.join(_this3.options.cacheDir, name + '.wasm'); // Run rustc to compile the code

      const args = ['+nightly', '--target', RUST_TARGET, '-O', '--crate-type=cdylib', _this3.name, '-o', _this3.wasmPath];
      const minifyArgs = _this3.options.minify ? ['-Clink-arg=-s'] : [];
      yield exec('rustc', [...args, ...minifyArgs]); // Run again to collect dependencies

      _this3.depsPath = path.join(_this3.options.cacheDir, name + '.d');
      yield exec('rustc', [_this3.name, '--emit=dep-info', '-o', _this3.depsPath]);
    })();
  }

  collectDependencies() {
    var _this4 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // Read deps file
      let contents = yield fs.readFile(_this4.depsPath, 'utf8');
      let dir = path.dirname(_this4.name);
      let deps = contents.split('\n').filter(Boolean).slice(1);

      var _iterator = _createForOfIteratorHelper(deps),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          let dep = _step.value;
          dep = path.resolve(dir, dep.slice(0, dep.indexOf(': ')));

          if (dep !== _this4.name) {
            _this4.addDependency(dep, {
              includedInParent: true
            });
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    })();
  }

  generate() {
    var _this5 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      return {
        wasm: {
          path: _this5.wasmPath,
          // pass output path to RawPackager
          mtime: Date.now() // force re-bundling since otherwise the hash would never change

        }
      };
    })();
  }

}

module.exports = RustAsset;