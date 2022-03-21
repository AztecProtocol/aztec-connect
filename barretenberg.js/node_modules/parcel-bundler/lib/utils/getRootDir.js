"use strict";

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const path = require('path');

function getRootDir(files) {
  let cur = null;

  var _iterator = _createForOfIteratorHelper(files),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      let file = _step.value;
      let parsed = path.parse(file);

      if (!cur) {
        cur = parsed;
      } else if (parsed.root !== cur.root) {
        // bail out. there is no common root.
        // this can happen on windows, e.g. C:\foo\bar vs. D:\foo\bar
        return process.cwd();
      } else {
        // find the common path parts.
        let curParts = cur.dir.split(path.sep);
        let newParts = parsed.dir.split(path.sep);
        let len = Math.min(curParts.length, newParts.length);
        let i = 0;

        while (i < len && curParts[i] === newParts[i]) {
          i++;
        }

        cur.dir = i > 1 ? curParts.slice(0, i).join(path.sep) : cur.root;
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return cur ? cur.dir : process.cwd();
}

module.exports = getRootDir;