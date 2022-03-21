"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const fs = require('@parcel/fs');

const path = require('path');

const md5 = require('./utils/md5');

const objectHash = require('./utils/objectHash');

const pkg = require('../package.json');

const logger = require('@parcel/logger');

const _require = require('./utils/glob'),
      isGlob = _require.isGlob,
      glob = _require.glob; // These keys can affect the output, so if they differ, the cache should not match


const OPTION_KEYS = ['publicURL', 'minify', 'hmr', 'target', 'scopeHoist', 'sourceMaps'];

class FSCache {
  constructor(options) {
    this.dir = path.resolve(options.cacheDir || '.cache');
    this.dirExists = false;
    this.invalidated = new Set();
    this.optionsHash = objectHash(OPTION_KEYS.reduce((p, k) => (p[k] = options[k], p), {
      version: pkg.version
    }));
  }

  ensureDirExists() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this.dirExists) {
        return;
      }

      yield fs.mkdirp(_this.dir); // Create sub-directories for every possible hex value
      // This speeds up large caches on many file systems since there are fewer files in a single directory.

      for (let i = 0; i < 256; i++) {
        yield fs.mkdirp(path.join(_this.dir, ('00' + i.toString(16)).slice(-2)));
      }

      _this.dirExists = true;
    })();
  }

  getCacheFile(filename) {
    let hash = md5(this.optionsHash + filename);
    return path.join(this.dir, hash.slice(0, 2), hash.slice(2) + '.json');
  }

  getLastModified(filename) {
    return (0, _asyncToGenerator2.default)(function* () {
      if (isGlob(filename)) {
        let files = yield glob(filename, {
          onlyFiles: true
        });
        return (yield Promise.all(files.map(file => fs.stat(file).then(({
          mtime
        }) => mtime.getTime())))).reduce((a, b) => Math.max(a, b), 0);
      }

      return (yield fs.stat(filename)).mtime.getTime();
    })();
  }

  writeDepMtimes(data) {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // Write mtimes for each dependent file that is already compiled into this asset
      var _iterator = _createForOfIteratorHelper(data.dependencies),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          let dep = _step.value;

          if (dep.includedInParent) {
            dep.mtime = yield _this2.getLastModified(dep.name);
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    })();
  }

  write(filename, data) {
    var _this3 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      try {
        yield _this3.ensureDirExists();
        yield _this3.writeDepMtimes(data);
        yield fs.writeFile(_this3.getCacheFile(filename), JSON.stringify(data));

        _this3.invalidated.delete(filename);
      } catch (err) {
        logger.error(`Error writing to cache: ${err.message}`);
      }
    })();
  }

  checkDepMtimes(data) {
    var _this4 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // Check mtimes for files that are already compiled into this asset
      // If any of them changed, invalidate.
      var _iterator2 = _createForOfIteratorHelper(data.dependencies),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          let dep = _step2.value;

          if (dep.includedInParent) {
            if ((yield _this4.getLastModified(dep.name)) > dep.mtime) {
              return false;
            }
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      return true;
    })();
  }

  read(filename) {
    var _this5 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this5.invalidated.has(filename)) {
        return null;
      }

      let cacheFile = _this5.getCacheFile(filename);

      try {
        let stats = yield fs.stat(filename);
        let cacheStats = yield fs.stat(cacheFile);

        if (stats.mtime > cacheStats.mtime) {
          return null;
        }

        let json = yield fs.readFile(cacheFile);
        let data = JSON.parse(json);

        if (!(yield _this5.checkDepMtimes(data))) {
          return null;
        }

        return data;
      } catch (err) {
        return null;
      }
    })();
  }

  invalidate(filename) {
    this.invalidated.add(filename);
  }

  delete(filename) {
    var _this6 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      try {
        yield fs.unlink(_this6.getCacheFile(filename));

        _this6.invalidated.delete(filename);
      } catch (err) {// Fail silently
      }
    })();
  }

}

module.exports = FSCache;