"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

// const CSSAsset = require('./CSSAsset');
const Asset = require('../Asset');

const localRequire = require('../utils/localRequire');

const Resolver = require('../Resolver');

const fs = require('@parcel/fs');

const _require = require('path'),
      dirname = _require.dirname,
      resolve = _require.resolve,
      relative = _require.relative;

const _require2 = require('../utils/glob'),
      isGlob = _require2.isGlob,
      glob = _require2.glob;

const URL_RE = /^(?:url\s*\(\s*)?['"]?(?:[#/]|(?:https?:)?\/\/)/i;

class StylusAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'css';
  }

  parse(code) {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // stylus should be installed locally in the module that's being required
      let stylus = yield localRequire('stylus', _this.name);
      let opts = yield _this.getConfig(['.stylusrc', '.stylusrc.js'], {
        packageKey: 'stylus'
      });
      let style = stylus(code, opts);
      style.set('filename', _this.name);
      style.set('include css', true); // Setup a handler for the URL function so we add dependencies for linked assets.

      style.define('url', node => {
        let filename = _this.addURLDependency(node.val, node.filename);

        return new stylus.nodes.Literal(`url(${JSON.stringify(filename)})`);
      });
      style.set('Evaluator', yield createEvaluator(code, _this, style.options));
      return style;
    })();
  }

  generate() {
    return [{
      type: 'css',
      value: this.ast.render(),
      hasDependencies: false
    }];
  }

  generateErrorMessage(err) {
    let index = err.message.indexOf('\n');
    err.codeFrame = err.message.slice(index + 1);
    err.message = err.message.slice(0, index);
    return err;
  }

}

function getDependencies(_x, _x2, _x3, _x4) {
  return _getDependencies.apply(this, arguments);
}

function _getDependencies() {
  _getDependencies = (0, _asyncToGenerator2.default)(function* (code, filepath, asset, options, seen = new Set()) {
    seen.add(filepath);

    const _yield$Promise$all = yield Promise.all(['parser', 'visitor/deps-resolver', 'nodes', 'utils'].map(dep => localRequire('stylus/lib/' + dep, filepath))),
          _yield$Promise$all2 = (0, _slicedToArray2.default)(_yield$Promise$all, 4),
          Parser = _yield$Promise$all2[0],
          DepsResolver = _yield$Promise$all2[1],
          nodes = _yield$Promise$all2[2],
          utils = _yield$Promise$all2[3];

    nodes.filename = asset.name;
    let parser = new Parser(code, options);
    let ast = parser.parse();
    let deps = new Map();
    let resolver = new Resolver(Object.assign({}, asset.options, {
      extensions: ['.styl', '.css']
    }));

    class ImportVisitor extends DepsResolver {
      visitImport(imported) {
        let path = imported.path.first.string;

        if (!deps.has(path)) {
          if (isGlob(path)) {
            deps.set(path, glob(resolve(dirname(filepath), path), {
              onlyFiles: true
            }).then(entries => Promise.all(entries.map(entry => resolver.resolve('./' + relative(dirname(filepath), entry), filepath)))));
          } else {
            deps.set(path, resolver.resolve(path, filepath));
          }
        }
      }

    }

    new ImportVisitor(ast, options).visit(ast); // Recursively process depdendencies, and return a map with all resolved paths.

    let res = new Map();
    yield Promise.all(Array.from(deps.entries()).map( /*#__PURE__*/function () {
      var _ref = (0, _asyncToGenerator2.default)(function* ([path, resolved]) {
        try {
          resolved = yield resolved;
          resolved = Array.isArray(resolved) ? resolved.map(r => r.path) : resolved.path;
        } catch (err) {
          resolved = null;
        }

        let found;

        if (resolved) {
          found = Array.isArray(resolved) ? resolved : [resolved];
          res.set(path, resolved);
        } else {
          // If we couldn't resolve, try the normal stylus resolver.
          // We just need to do this to keep track of the dependencies - stylus does the real work.
          // support optional .styl
          let originalPath = path;

          if (!/\.styl$/i.test(path)) {
            path += '.styl';
          }

          let paths = (options.paths || []).concat(dirname(filepath || '.'));
          found = utils.find(path, paths, filepath);

          if (!found) {
            found = utils.lookupIndex(originalPath, paths, filepath);
          }

          if (!found) {
            throw new Error('failed to locate file ' + originalPath);
          }
        } // Recursively process resolved files as well to get nested deps


        var _iterator2 = _createForOfIteratorHelper(found),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            let resolved = _step2.value;

            if (!seen.has(resolved)) {
              asset.addDependency(resolved, {
                includedInParent: true
              });
              let code = yield fs.readFile(resolved, 'utf8');

              var _iterator3 = _createForOfIteratorHelper(yield getDependencies(code, resolved, asset, options, seen)),
                  _step3;

              try {
                for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
                  let _step3$value = (0, _slicedToArray2.default)(_step3.value, 2),
                      path = _step3$value[0],
                      resolvedPath = _step3$value[1];

                  res.set(path, resolvedPath);
                }
              } catch (err) {
                _iterator3.e(err);
              } finally {
                _iterator3.f();
              }
            }
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      });

      return function (_x8) {
        return _ref.apply(this, arguments);
      };
    }()));
    return res;
  });
  return _getDependencies.apply(this, arguments);
}

function createEvaluator(_x5, _x6, _x7) {
  return _createEvaluator.apply(this, arguments);
}
/**
 * Puts the content of all given node blocks into the first one, essentially merging them.
 */


function _createEvaluator() {
  _createEvaluator = (0, _asyncToGenerator2.default)(function* (code, asset, options) {
    const deps = yield getDependencies(code, asset.name, asset, options);
    const Evaluator = yield localRequire('stylus/lib/visitor/evaluator', asset.name); // This is a custom stylus evaluator that extends stylus with support for the node
    // require resolution algorithm. It also adds all dependencies to the parcel asset
    // tree so the file watcher works correctly, etc.

    class CustomEvaluator extends Evaluator {
      visitImport(imported) {
        let node = this.visit(imported.path).first;
        let path = node.string;

        if (node.name !== 'url' && path && !URL_RE.test(path)) {
          let resolved = deps.get(path); // First try resolving using the node require resolution algorithm.
          // This allows stylus files in node_modules to be resolved properly.
          // If we find something, update the AST so stylus gets the absolute path to load later.

          if (resolved) {
            if (!Array.isArray(resolved)) {
              node.string = resolved;
            } else {
              // If the import resolves to multiple files (i.e. glob),
              // replace it with a separate import node for each file
              return mergeBlocks(resolved.map(resolvedPath => {
                node.string = resolvedPath;
                return super.visitImport(imported.clone());
              }));
            }
          }
        } // Done. Let stylus do its thing.


        return super.visitImport(imported);
      }

    }

    return CustomEvaluator;
  });
  return _createEvaluator.apply(this, arguments);
}

function mergeBlocks(blocks) {
  let finalBlock;

  var _iterator = _createForOfIteratorHelper(blocks),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      const block = _step.value;
      if (!finalBlock) finalBlock = block;else {
        block.nodes.forEach(node => finalBlock.push(node));
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return finalBlock;
}

module.exports = StylusAsset;