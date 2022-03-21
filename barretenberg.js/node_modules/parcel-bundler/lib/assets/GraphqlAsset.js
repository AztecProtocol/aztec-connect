"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const Asset = require('../Asset');

const localRequire = require('../utils/localRequire');

const Resolver = require('../Resolver');

const fs = require('@parcel/fs');

const os = require('os');

const IMPORT_RE = /^# *import +['"](.*)['"] *;? *$/;

class GraphqlAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'js';
    this.gqlMap = new Map();
    this.gqlResolver = new Resolver(Object.assign({}, this.options, {
      extensions: ['.gql', '.graphql']
    }));
  }

  traverseImports(name, code) {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _this.gqlMap.set(name, code);

      yield Promise.all(code.split(/\r\n?|\n/).map(line => line.match(IMPORT_RE)).filter(match => !!match).map( /*#__PURE__*/function () {
        var _ref = (0, _asyncToGenerator2.default)(function* ([, importName]) {
          let _yield$_this$gqlResol = yield _this.gqlResolver.resolve(importName, name),
              resolved = _yield$_this$gqlResol.path;

          if (_this.gqlMap.has(resolved)) {
            return;
          }

          let code = yield fs.readFile(resolved, 'utf8');
          yield _this.traverseImports(resolved, code);
        });

        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }()));
    })();
  }

  collectDependencies() {
    var _iterator = _createForOfIteratorHelper(this.gqlMap),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        let _step$value = (0, _slicedToArray2.default)(_step.value, 1),
            path = _step$value[0];

        this.addDependency(path, {
          includedInParent: true
        });
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }

  parse(code) {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let gql = yield localRequire('graphql-tag', _this2.name);
      yield _this2.traverseImports(_this2.name, code);
      const allCodes = [..._this2.gqlMap.values()].join(os.EOL);
      return gql(allCodes);
    })();
  }

  generate() {
    return `module.exports=${JSON.stringify(this.ast, null, 2)};`;
  }

}

module.exports = GraphqlAsset;