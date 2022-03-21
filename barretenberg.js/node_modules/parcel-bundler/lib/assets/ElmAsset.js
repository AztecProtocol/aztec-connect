"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const Asset = require('../Asset');

const commandExists = require('command-exists');

const localRequire = require('../utils/localRequire');

const _require = require('terser'),
      minify = _require.minify;

const path = require('path');

const spawn = require('cross-spawn');

class ElmAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'js';
  }

  parse() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let options = {
        cwd: path.dirname(_this.name)
      }; // If elm is not installed globally, install it locally.

      try {
        yield commandExists('elm');
      } catch (err) {
        yield localRequire('elm', _this.name);
        options.pathToElm = path.join(path.dirname(require.resolve('elm')), 'bin', 'elm');
      }

      _this.elm = yield localRequire('node-elm-compiler', _this.name); // Ensure that an elm.json file exists, and initialize one if not.

      let elmConfig = yield _this.getConfig(['elm.json'], {
        load: false
      });

      if (!elmConfig) {
        yield _this.createElmConfig(options); // Ensure we are watching elm.json for changes

        yield _this.getConfig(['elm.json'], {
          load: false
        });
      }

      options.debug = !_this.options.production;

      if (_this.options.minify) {
        options.optimize = true;
      }

      _this.elmOpts = options;
    })();
  }

  collectDependencies() {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let dependencies = yield _this2.elm.findAllDependencies(_this2.name);

      var _iterator = _createForOfIteratorHelper(dependencies),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          let dependency = _step.value;

          _this2.addDependency(dependency, {
            includedInParent: true
          });
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    })();
  }

  createElmConfig(options) {
    return (0, _asyncToGenerator2.default)(function* () {
      let cp = spawn(options.pathToElm || 'elm', ['init']);
      cp.stdin.write('y\n');
      return new Promise((resolve, reject) => {
        cp.on('error', reject);
        cp.on('close', function (code) {
          if (code !== 0) {
            return reject(new Error('elm init failed.'));
          }

          return resolve();
        });
      });
    })();
  }

  generate() {
    var _this3 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let compiled = yield _this3.elm.compileToString(_this3.name, _this3.elmOpts);
      _this3.contents = compiled.toString();

      if (_this3.options.hmr) {
        let _yield$localRequire = yield localRequire('elm-hot', _this3.name),
            inject = _yield$localRequire.inject;

        _this3.contents = inject(_this3.contents);
      }

      let output = _this3.contents;

      if (_this3.options.minify) {
        output = pack(output);
      }

      return {
        [_this3.type]: output
      }; // Recommended minification
      // Based on:
      // - http://elm-lang.org/0.19.0/optimize

      function pack(source) {
        let options = {
          compress: {
            keep_fargs: false,
            passes: 2,
            pure_funcs: ['F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'],
            pure_getters: true,
            unsafe: true,
            unsafe_comps: true
          },
          mangle: true,
          rename: false
        };
        let result = minify(source, options);

        if (result.error) {
          throw result.error;
        }

        return result.code;
      }
    })();
  }

  generateErrorMessage(err) {
    // The generated stack is not useful, but other code may
    // expect it and try to print it, so make it an empty string.
    err.stack = '';
    return err;
  }

}

module.exports = ElmAsset;