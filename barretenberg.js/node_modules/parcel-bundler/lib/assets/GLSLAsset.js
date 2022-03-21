"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const Asset = require('../Asset');

const localRequire = require('../utils/localRequire');

const path = require('path');

const _require = require('@parcel/utils'),
      promisify = _require.promisify;

const Resolver = require('../Resolver');

class GLSLAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'js';
  }

  parse() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      const glslifyDeps = yield localRequire('glslify-deps', _this.name); // Use the Parcel resolver rather than the default glslify one.
      // This adds support for parcel features like aliases, and tilde paths.

      const resolver = new Resolver({
        extensions: ['.glsl', '.vert', '.frag'],
        rootDir: _this.options.rootDir
      }); // Parse and collect dependencies with glslify-deps

      let cwd = path.dirname(_this.name);
      let depper = glslifyDeps({
        cwd,
        resolve: function () {
          var _resolve = (0, _asyncToGenerator2.default)(function* (target, opts, next) {
            try {
              let res = yield resolver.resolve(target, path.join(opts.basedir, 'index'));
              next(null, res.path);
            } catch (err) {
              next(err);
            }
          });

          function resolve(_x, _x2, _x3) {
            return _resolve.apply(this, arguments);
          }

          return resolve;
        }()
      });
      return promisify(depper.inline.bind(depper))(_this.contents, cwd);
    })();
  }

  collectDependencies() {
    var _iterator = _createForOfIteratorHelper(this.ast),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        let dep = _step.value;

        if (!dep.entry) {
          this.addDependency(dep.file, {
            includedInParent: true
          });
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  generate() {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // Generate the bundled glsl file
      const glslifyBundle = yield localRequire('glslify-bundle', _this2.name);
      let glsl = glslifyBundle(_this2.ast);
      return `module.exports=${JSON.stringify(glsl)};`;
    })();
  }

}

module.exports = GLSLAsset;