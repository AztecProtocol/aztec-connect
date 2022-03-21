"use strict";

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const rename = require('./renamer');

const t = require('@babel/types');

const CHARSET = ('abcdefghijklmnopqrstuvwxyz' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ$_').split('');
/**
 * This is a very specialized mangler designer to mangle only names in the top-level scope.
 * Mangling of names in other scopes happens at a file level inside workers, but we can't
 * mangle the top-level scope until scope hoisting is complete in the packager.
 *
 * Based on code from babel-minify!
 * https://github.com/babel/minify/blob/master/packages/babel-plugin-minify-mangle-names/src/charset.js
 */

function mangleScope(scope) {
  let newNames = new Set(); // Sort bindings so that more frequently referenced bindings get shorter names.

  let sortedBindings = Object.keys(scope.bindings).sort((a, b) => scope.bindings[b].referencePaths.length - scope.bindings[a].referencePaths.length);

  var _iterator = _createForOfIteratorHelper(sortedBindings),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      let oldName = _step.value;
      let i = 0;
      let newName = '';

      do {
        newName = getIdentifier(i++);
      } while (newNames.has(newName) || !canRename(scope, scope.bindings[oldName], newName));

      rename(scope, oldName, newName);
      newNames.add(newName);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
}

function getIdentifier(num) {
  let ret = '';
  num++;

  do {
    num--;
    ret += CHARSET[num % CHARSET.length];
    num = Math.floor(num / CHARSET.length);
  } while (num > 0);

  return ret;
}

function canRename(scope, binding, newName) {
  if (!t.isValidIdentifier(newName)) {
    return false;
  } // If there are any references where the parent scope has a binding
  // for the new name, we cannot rename to this name.


  for (let i = 0; i < binding.referencePaths.length; i++) {
    const ref = binding.referencePaths[i];

    if (ref.scope.hasBinding(newName) || ref.scope.hasReference(newName)) {
      return false;
    }
  }

  return true;
}

module.exports = mangleScope;