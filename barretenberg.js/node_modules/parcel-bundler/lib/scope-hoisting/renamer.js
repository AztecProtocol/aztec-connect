"use strict";

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const t = require('@babel/types');

function rename(scope, oldName, newName) {
  if (oldName === newName) {
    return;
  }

  let binding = scope.getBinding(oldName);

  if (!binding) {
    throw new Error("'" + oldName + "' is not defined");
  } // Rename all constant violations


  var _iterator = _createForOfIteratorHelper(binding.constantViolations),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      let violation = _step.value;
      let bindingIds = violation.getBindingIdentifierPaths(true, false);

      for (let name in bindingIds) {
        if (name === oldName) {
          var _iterator3 = _createForOfIteratorHelper(bindingIds[name]),
              _step3;

          try {
            for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
              let idPath = _step3.value;
              idPath.node.name = newName;
            }
          } catch (err) {
            _iterator3.e(err);
          } finally {
            _iterator3.f();
          }
        }
      }
    } // Rename all references

  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  var _iterator2 = _createForOfIteratorHelper(binding.referencePaths),
      _step2;

  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      let path = _step2.value;

      if (t.isExportSpecifier(path.parent) && path.parentPath.parent.source) {
        continue;
      }

      if (path.node.name === oldName) {
        path.node.name = newName;
      }
    } // Rename binding identifier, and update scope.

  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }

  scope.removeOwnBinding(oldName);
  scope.bindings[newName] = binding;
  binding.identifier.name = newName;
}

module.exports = rename;