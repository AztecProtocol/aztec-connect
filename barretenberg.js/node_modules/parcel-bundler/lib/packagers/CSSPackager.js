"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const path = require('path');

const Packager = require('./Packager');

const lineCounter = require('../utils/lineCounter');

const urlJoin = require('../utils/urlJoin');

class CSSPackager extends Packager {
  start() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _this.lineOffset = 0;
      _this.columnOffset = 0;
    })();
  }

  addAsset(asset) {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let css = asset.generated.css || ''; // Figure out which media types this asset was imported with.
      // We only want to import the asset once, so group them all together.

      let media = [];

      var _iterator = _createForOfIteratorHelper(asset.parentDeps),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          let dep = _step.value;

          if (!dep.media) {
            // Asset was imported without a media type. Don't wrap in @media.
            media.length = 0;
            break;
          } else {
            media.push(dep.media);
          }
        } // If any, wrap in an @media block

      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      if (media.length) {
        css = `@media ${media.join(', ')} {\n${css.trim()}\n}\n`;
      }

      if (asset.options.sourceMaps) {
        let lineCount = lineCounter(css);

        if (lineCount == 1) {
          _this2.bundle.addOffset(asset, _this2.lineOffset, _this2.columnOffset);

          yield _this2.write(css);
          _this2.columnOffset += css.length;
        } else {
          const lines = css.split('\n');

          if (_this2.columnOffset == 0) {
            _this2.bundle.addOffset(asset, _this2.lineOffset, 0);

            yield _this2.write(css + '\n');
          } else {
            _this2.columnOffset = 0;

            _this2.bundle.addOffset(asset, _this2.lineOffset + 1, 0);

            _this2.columnOffset = lines[lines.length - 1].length;
            yield _this2.write('\n' + css);
          }

          _this2.lineOffset += lineCount;
        }
      } else {
        yield _this2.write(css);
      }
    })();
  }

  end() {
    var _superprop_getEnd = () => super.end,
        _this3 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this3.options.sourceMaps) {
        // Add source map url if a map bundle exists
        let mapBundle = _this3.bundle.siblingBundlesMap.get('map');

        if (mapBundle) {
          let mapUrl = urlJoin(_this3.options.publicURL, path.basename(mapBundle.name));
          yield _this3.write(`\n/*# sourceMappingURL=${mapUrl} */`);
        }
      }

      yield _superprop_getEnd().call(_this3);
    })();
  }

}

module.exports = CSSPackager;