"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const Packager = require('./Packager');

const posthtml = require('posthtml');

const path = require('path');

const urlJoin = require('../utils/urlJoin'); // https://www.w3.org/TR/html5/dom.html#metadata-content-2


const metadataContent = new Set(['base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title']);

class HTMLPackager extends Packager {
  static shouldAddAsset() {
    // We cannot combine multiple HTML files together - they should be written as separate bundles.
    return false;
  }

  addAsset(asset) {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let html = asset.generated.html || ''; // Find child bundles that have JS or CSS sibling bundles,
      // add them to the head so they are loaded immediately.

      let siblingBundles = Array.from(_this.bundle.childBundles).reduce((p, b) => p.concat([...b.siblingBundles.values()]), []).filter(b => b.type === 'css' || b.type === 'js');

      if (siblingBundles.length > 0) {
        html = posthtml(_this.insertSiblingBundles.bind(_this, siblingBundles)).process(html, {
          sync: true
        }).html;
      }

      yield _this.write(html);
    })();
  }

  addBundlesToTree(bundles, tree) {
    const head = find(tree, 'head');

    if (head) {
      const content = head.content || (head.content = []);
      content.push(...bundles);
      return;
    }

    const html = find(tree, 'html');
    const content = html ? html.content || (html.content = []) : tree;
    const index = findBundleInsertIndex(content);
    content.splice(index, 0, ...bundles);
  }

  insertSiblingBundles(siblingBundles, tree) {
    const bundles = [];

    var _iterator = _createForOfIteratorHelper(siblingBundles),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        let bundle = _step.value;

        if (bundle.type === 'css') {
          bundles.push({
            tag: 'link',
            attrs: {
              rel: 'stylesheet',
              href: urlJoin(this.options.publicURL, path.basename(bundle.name))
            }
          });
        } else if (bundle.type === 'js') {
          bundles.push({
            tag: 'script',
            attrs: {
              src: urlJoin(this.options.publicURL, path.basename(bundle.name))
            }
          });
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    this.addBundlesToTree(bundles, tree);
  }

}

function find(tree, tag) {
  let res;
  tree.match({
    tag
  }, node => {
    res = node;
    return node;
  });
  return res;
}

function findBundleInsertIndex(content) {
  for (let index = 0; index < content.length; index++) {
    const node = content[index];

    if (node && node.tag && !metadataContent.has(node.tag)) {
      return index;
    }
  }

  return 0;
}

module.exports = HTMLPackager;