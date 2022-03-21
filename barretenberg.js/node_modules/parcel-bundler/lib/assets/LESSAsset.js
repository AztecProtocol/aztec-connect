"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const Asset = require('../Asset');

const localRequire = require('../utils/localRequire');

const _require = require('@parcel/utils'),
      promisify = _require.promisify;

const Resolver = require('../Resolver');

const fs = require('@parcel/fs');

const path = require('path');

const parseCSSImport = require('../utils/parseCSSImport');

class LESSAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'css';
  }

  parse(code) {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // less should be installed locally in the module that's being required
      let less = yield localRequire('less', _this.name);
      let render = promisify(less.render.bind(less));
      let opts = (yield _this.getConfig(['.lessrc', '.lessrc.js'], {
        packageKey: 'less'
      })) || {};
      opts.filename = _this.name;
      opts.plugins = (opts.plugins || []).concat(urlPlugin(_this));

      if (_this.options.sourceMaps) {
        opts.sourceMap = {
          outputSourceFiles: true
        };
      }

      return render(code, opts);
    })();
  }

  collectDependencies() {
    var _iterator = _createForOfIteratorHelper(this.ast.imports),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        let dep = _step.value;
        this.addDependency(dep, {
          includedInParent: true
        });
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  generate() {
    let map;

    if (this.ast && this.ast.map) {
      map = JSON.parse(this.ast.map.toString());
      map.sources = map.sources.map(v => path.relative(this.options.rootDir, v));
    }

    return [{
      type: 'css',
      value: this.ast ? this.ast.css : '',
      hasDependencies: false,
      map
    }];
  }

}

function urlPlugin(asset) {
  return {
    install: (less, pluginManager) => {
      let visitor = new less.visitors.Visitor({
        visitUrl: node => {
          node.value.value = asset.addURLDependency(node.value.value, node.currentFileInfo.filename);
          return node;
        }
      });
      visitor.run = visitor.visit;
      pluginManager.addVisitor(visitor);
      let LessFileManager = getFileManager(less, asset.options);
      pluginManager.addFileManager(new LessFileManager());
    }
  };
}

function getFileManager(less, options) {
  const resolver = new Resolver({
    extensions: ['.css', '.less'],
    rootDir: options.rootDir
  });

  class LessFileManager extends less.FileManager {
    supports() {
      return true;
    }

    supportsSync() {
      return false;
    }

    loadFile(filename, currentDirectory) {
      return (0, _asyncToGenerator2.default)(function* () {
        filename = parseCSSImport(filename);
        let resolved = yield resolver.resolve(filename, path.join(currentDirectory, 'index'));
        return {
          contents: yield fs.readFile(resolved.path, 'utf8'),
          filename: resolved.path
        };
      })();
    }

  }

  return LessFileManager;
}

module.exports = LESSAsset;