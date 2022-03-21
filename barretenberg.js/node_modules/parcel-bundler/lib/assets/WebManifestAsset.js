"use strict";

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const Asset = require('../Asset');

class WebManifestAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'webmanifest';
  }

  parse(content) {
    return JSON.parse(content);
  }

  collectDependencies() {
    if (Array.isArray(this.ast.icons)) {
      var _iterator = _createForOfIteratorHelper(this.ast.icons),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          let icon = _step.value;
          icon.src = this.addURLDependency(icon.src);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }

    if (Array.isArray(this.ast.screenshots)) {
      var _iterator2 = _createForOfIteratorHelper(this.ast.screenshots),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          let shot = _step2.value;
          shot.src = this.addURLDependency(shot.src);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }

    if (this.ast.serviceworker && this.ast.serviceworker.src) {
      this.ast.serviceworker.src = this.addURLDependency(this.ast.serviceworker.src);
    }
  }

  generate() {
    return JSON.stringify(this.ast);
  }

}

module.exports = WebManifestAsset;