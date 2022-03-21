"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const Asset = require('../Asset');

const micromatch = require('micromatch');

const path = require('path');

const _require = require('../utils/glob'),
      glob = _require.glob;

class GlobAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = null; // allows this asset to be included in any type bundle
  }

  load() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let regularExpressionSafeName = _this.name;
      if (process.platform === 'win32') regularExpressionSafeName = regularExpressionSafeName.replace(/\\/g, '/');
      let files = yield glob(regularExpressionSafeName, {
        onlyFiles: true
      });
      let re = micromatch.makeRe(regularExpressionSafeName, {
        capture: true
      });
      let matches = {};

      var _iterator = _createForOfIteratorHelper(files),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          let file = _step.value;
          let match = file.match(re);
          let parts = match.slice(1).filter(Boolean).reduce((a, p) => a.concat(p.split('/')), []);
          let relative = './' + path.relative(path.dirname(_this.name), file.normalize('NFC'));
          set(matches, parts, relative);

          _this.addDependency(relative);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      return matches;
    })();
  }

  generate() {
    return [{
      type: 'js',
      value: 'module.exports = ' + generate(this.contents) + ';'
    }];
  }

}

function generate(matches, indent = '') {
  if (typeof matches === 'string') {
    return `require(${JSON.stringify(matches)})`;
  }

  let res = indent + '{';
  let first = true;

  for (let key in matches) {
    if (!first) {
      res += ',';
    }

    res += `\n${indent}  ${JSON.stringify(key)}: ${generate(matches[key], indent + '  ')}`;
    first = false;
  }

  res += '\n' + indent + '}';
  return res;
}

function set(obj, path, value) {
  for (let i = 0; i < path.length - 1; i++) {
    let part = path[i];

    if (obj[part] == null) {
      obj[part] = {};
    }

    obj = obj[part];
  }

  obj[path[path.length - 1]] = value;
}

module.exports = GlobAsset;