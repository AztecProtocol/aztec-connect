"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const path = require('path');

const Asset = require('../Asset');

const localRequire = require('../utils/localRequire');

class PugAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'html';
    this.hmrPageReload = true;
  }

  generate() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      const pug = yield localRequire('pug', _this.name);
      const config = (yield _this.getConfig(['.pugrc', '.pugrc.js', 'pug.config.js'])) || {};
      const compiled = pug.compile(_this.contents, {
        compileDebug: false,
        filename: _this.name,
        basedir: path.dirname(_this.name),
        pretty: config.pretty || false,
        templateName: path.basename(_this.basename, path.extname(_this.basename)),
        filters: config.filters,
        filterOptions: config.filterOptions,
        filterAliases: config.filterAliases
      });

      if (compiled.dependencies) {
        var _iterator = _createForOfIteratorHelper(compiled.dependencies),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            let item = _step.value;

            _this.addDependency(item, {
              includedInParent: true
            });
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }

      return compiled(config.locals);
    })();
  }

}

module.exports = PugAsset;