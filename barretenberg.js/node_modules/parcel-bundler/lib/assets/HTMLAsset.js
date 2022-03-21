"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const Asset = require('../Asset');

const api = require('posthtml/lib/api');

const urlJoin = require('../utils/urlJoin');

const render = require('posthtml-render');

const posthtmlTransform = require('../transforms/posthtml');

const htmlnanoTransform = require('../transforms/htmlnano');

const isURL = require('../utils/is-url'); // A list of all attributes that may produce a dependency
// Based on https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes


const ATTRS = {
  src: ['script', 'img', 'audio', 'video', 'source', 'track', 'iframe', 'embed'],
  href: ['link', 'a', 'use'],
  srcset: ['img', 'source'],
  poster: ['video'],
  'xlink:href': ['use', 'image'],
  content: ['meta'],
  data: ['object']
}; // A list of metadata that should produce a dependency
// Based on:
// - http://schema.org/
// - http://ogp.me
// - https://developer.twitter.com/en/docs/tweets/optimize-with-cards/overview/markup
// - https://msdn.microsoft.com/en-us/library/dn255024.aspx

const META = {
  property: ['og:image', 'og:image:url', 'og:image:secure_url', 'og:audio', 'og:audio:secure_url', 'og:video', 'og:video:secure_url'],
  name: ['twitter:image', 'msapplication-square150x150logo', 'msapplication-square310x310logo', 'msapplication-square70x70logo', 'msapplication-wide310x150logo', 'msapplication-TileImage', 'msapplication-config'],
  itemprop: ['image', 'logo', 'screenshot', 'thumbnailUrl', 'contentUrl', 'downloadUrl']
};
const SCRIPT_TYPES = {
  'application/javascript': 'js',
  'text/javascript': 'js',
  'application/json': false,
  'application/ld+json': 'jsonld',
  'text/html': false
}; // Options to be passed to `addURLDependency` for certain tags + attributes

const OPTIONS = {
  a: {
    href: {
      entry: true
    }
  },
  iframe: {
    src: {
      entry: true
    }
  }
};

class HTMLAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'html';
    this.isAstDirty = false;
    this.hmrPageReload = true;
  }

  parse(code) {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let res = yield posthtmlTransform.parse(code, _this);
      res.walk = api.walk;
      res.match = api.match;
      return res;
    })();
  }

  processSingleDependency(path, opts) {
    let assetPath = this.addURLDependency(path, opts);

    if (!isURL(assetPath)) {
      assetPath = urlJoin(this.options.publicURL, assetPath);
    }

    return assetPath;
  }

  collectSrcSetDependencies(srcset, opts) {
    const newSources = [];

    var _iterator = _createForOfIteratorHelper(srcset.split(',')),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        const source = _step.value;
        const pair = source.trim().split(' ');
        if (pair.length === 0) continue;
        pair[0] = this.processSingleDependency(pair[0], opts);
        newSources.push(pair.join(' '));
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return newSources.join(',');
  }

  getAttrDepHandler(attr) {
    if (attr === 'srcset') {
      return this.collectSrcSetDependencies;
    }

    return this.processSingleDependency;
  }

  collectDependencies() {
    let ast = this.ast; // Add bundled dependencies from plugins like posthtml-extend or posthtml-include, if any

    if (ast.messages) {
      ast.messages.forEach(message => {
        if (message.type === 'dependency') {
          this.addDependency(message.file, {
            includedInParent: true
          });
        }
      });
    }

    ast.walk(node => {
      if (node.attrs) {
        if (node.tag === 'meta') {
          if (!Object.keys(node.attrs).some(attr => {
            let values = META[attr];
            return values && values.includes(node.attrs[attr]) && node.attrs.content !== '';
          })) {
            return node;
          }
        }

        if (node.tag === 'link' && node.attrs.rel === 'manifest' && node.attrs.href) {
          node.attrs.href = this.getAttrDepHandler('href').call(this, node.attrs.href, {
            entry: true
          });
          this.isAstDirty = true;
          return node;
        }

        for (let attr in node.attrs) {
          const attrVal = node.attrs[attr];

          if (!attrVal) {
            continue;
          } // Check for virtual paths


          if (node.tag === 'a' && attrVal.lastIndexOf('.') < 1) {
            continue;
          }

          let elements = ATTRS[attr];

          if (elements && elements.includes(node.tag)) {
            let depHandler = this.getAttrDepHandler(attr);
            let options = OPTIONS[node.tag];
            node.attrs[attr] = depHandler.call(this, attrVal, options && options[attr]);
            this.isAstDirty = true;
          }
        }
      }

      return node;
    });
  }

  pretransform() {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      yield posthtmlTransform.transform(_this2);
    })();
  }

  transform() {
    var _this3 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this3.options.minify) {
        yield htmlnanoTransform(_this3);
      }
    })();
  }

  generate() {
    var _this4 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // Extract inline <script> and <style> tags for processing.
      let parts = [];

      if (_this4.ast) {
        _this4.ast.walk(node => {
          if (node.tag === 'script' || node.tag === 'style') {
            let value = node.content && node.content.join('').trim();

            if (value) {
              let type;

              if (node.tag === 'style') {
                if (node.attrs && node.attrs.type) {
                  type = node.attrs.type.split('/')[1];
                } else {
                  type = 'css';
                }
              } else if (node.attrs && node.attrs.type) {
                // Skip JSON
                if (SCRIPT_TYPES[node.attrs.type] === false) {
                  return node;
                }

                if (SCRIPT_TYPES[node.attrs.type]) {
                  type = SCRIPT_TYPES[node.attrs.type];
                } else {
                  type = node.attrs.type.split('/')[1];
                }
              } else {
                type = 'js';
              }

              parts.push({
                type,
                value,
                inlineHTML: true,
                meta: {
                  type: 'tag',
                  node
                }
              });
            }
          } // Process inline style attributes.


          if (node.attrs && node.attrs.style) {
            parts.push({
              type: 'css',
              value: node.attrs.style,
              meta: {
                type: 'attr',
                node
              }
            });
          }

          return node;
        });
      }

      return parts;
    })();
  }

  postProcess(generated) {
    var _this5 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // Replace inline scripts and styles with processed results.
      var _iterator2 = _createForOfIteratorHelper(generated),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          let rendition = _step2.value;
          let _rendition$meta = rendition.meta,
              type = _rendition$meta.type,
              node = _rendition$meta.node;

          if (type === 'attr' && rendition.type === 'css') {
            node.attrs.style = rendition.value;
          } else if (type === 'tag') {
            if (rendition.isMain) {
              node.content = rendition.value;
            } // Delete "type" attribute, since CSS and JS are the defaults.
            // Unless it's application/ld+json


            if (node.attrs && (node.tag === 'style' || node.attrs.type && SCRIPT_TYPES[node.attrs.type] === 'js')) {
              delete node.attrs.type;
            }
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      return [{
        type: 'html',
        value: render(_this5.ast)
      }];
    })();
  }

}

module.exports = HTMLAsset;