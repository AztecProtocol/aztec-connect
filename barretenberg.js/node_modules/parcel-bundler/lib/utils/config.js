"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const fs = require('@parcel/fs');

const path = require('path');

const clone = require('clone');

const PARSERS = {
  json: require('json5').parse,
  toml: require('@iarna/toml').parse
};
const existsCache = new Map();

function resolve(_x, _x2) {
  return _resolve.apply(this, arguments);
}

function _resolve() {
  _resolve = (0, _asyncToGenerator2.default)(function* (filepath, filenames, root = path.parse(filepath).root) {
    filepath = path.dirname(filepath); // Don't traverse above the module root

    if (filepath === root || path.basename(filepath) === 'node_modules') {
      return null;
    }

    var _iterator = _createForOfIteratorHelper(filenames),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        const filename = _step.value;
        let file = path.join(filepath, filename);
        let exists = existsCache.has(file) ? existsCache.get(file) : yield fs.exists(file);

        if (exists) {
          existsCache.set(file, true);
          return file;
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return resolve(filepath, filenames, root);
  });
  return _resolve.apply(this, arguments);
}

function load(_x3, _x4) {
  return _load.apply(this, arguments);
}

function _load() {
  _load = (0, _asyncToGenerator2.default)(function* (filepath, filenames, root = path.parse(filepath).root) {
    let configFile = yield resolve(filepath, filenames, root);

    if (configFile) {
      try {
        let extname = path.extname(configFile).slice(1);

        if (extname === 'js') {
          return clone(require(configFile));
        }

        let configContent = (yield fs.readFile(configFile)).toString();
        let parse = PARSERS[extname] || PARSERS.json;
        return configContent ? parse(configContent) : null;
      } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
          existsCache.delete(configFile);
          return null;
        }

        throw err;
      }
    }

    return null;
  });
  return _load.apply(this, arguments);
}

exports.resolve = resolve;
exports.load = load;