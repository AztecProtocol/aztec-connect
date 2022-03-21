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

const path = require('path');

const os = require('os');

const Resolver = require('../Resolver');

const parseCSSImport = require('../utils/parseCSSImport');

class SASSAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'css';
  }

  parse(code) {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // node-sass or dart-sass should be installed locally in the module that's being required
      let sass = yield getSassRuntime(_this.name);
      let render = promisify(sass.render.bind(sass));
      const resolver = new Resolver({
        extensions: ['.scss', '.sass'],
        rootDir: _this.options.rootDir
      });
      let opts = (yield _this.getConfig(['.sassrc', '.sassrc.js'], {
        packageKey: 'sass'
      })) || {};
      opts.includePaths = (opts.includePaths ? opts.includePaths.map(includePath => path.resolve(includePath)) : []).concat(path.dirname(_this.name));
      opts.data = opts.data ? opts.data + os.EOL + code : code;
      let type = _this.options.rendition ? _this.options.rendition.type : path.extname(_this.name).toLowerCase().replace('.', '');
      opts.indentedSyntax = typeof opts.indentedSyntax === 'boolean' ? opts.indentedSyntax : type === 'sass';
      opts.importer = opts.importer || [];
      opts.importer = Array.isArray(opts.importer) ? opts.importer : [opts.importer];
      opts.importer.push((url, prev, done) => {
        url = url.replace(/^file:\/\//, '');
        url = parseCSSImport(url);
        resolver.resolve(url, prev === 'stdin' ? _this.name : prev).then(resolved => resolved.path).catch(() => url).then(file => done({
          file
        })).catch(err => done(normalizeError(err)));
      });

      if (_this.options.sourceMaps) {
        opts.sourceMap = true;
        opts.file = _this.name;
        opts.outFile = _this.name;
        opts.omitSourceMapUrl = true;
        opts.sourceMapContents = true;
      }

      try {
        return yield render(opts);
      } catch (err) {
        // Format the error so it can be handled by parcel's prettyError
        if (err.formatted) {
          throw sassToCodeFrame(err);
        } // Throw original error if there is no codeFrame


        throw err;
      }
    })();
  }

  collectDependencies() {
    var _iterator = _createForOfIteratorHelper(this.ast.stats.includedFiles),
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
    return [{
      type: 'css',
      value: this.ast ? this.ast.css.toString() : '',
      map: this.ast && this.ast.map ? JSON.parse(this.ast.map.toString()) : undefined
    }];
  }

}

module.exports = SASSAsset;

function getSassRuntime(_x) {
  return _getSassRuntime.apply(this, arguments);
}

function _getSassRuntime() {
  _getSassRuntime = (0, _asyncToGenerator2.default)(function* (searchPath) {
    try {
      return yield localRequire('node-sass', searchPath, true);
    } catch (e) {
      // If node-sass is not used locally, install dart-sass, as this causes no freezing issues
      return localRequire('sass', searchPath);
    }
  });
  return _getSassRuntime.apply(this, arguments);
}

function sassToCodeFrame(err) {
  let error = new Error(err.message);
  error.codeFrame = err.formatted;
  error.stack = err.stack;
  error.fileName = err.file;
  error.loc = {
    line: err.line,
    column: err.column
  };
  return error;
} // Ensures an error inherits from Error


function normalizeError(err) {
  let message = 'Unknown error';

  if (err) {
    if (err instanceof Error) {
      return err;
    }

    message = err.stack || err.message || err;
  }

  return new Error(message);
}