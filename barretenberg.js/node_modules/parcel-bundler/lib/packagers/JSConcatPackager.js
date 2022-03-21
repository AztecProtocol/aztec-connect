"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const Packager = require('./Packager');

const path = require('path');

const concat = require('../scope-hoisting/concat');

const urlJoin = require('../utils/urlJoin');

const getExisting = require('../utils/getExisting');

const walk = require('babylon-walk');

const babylon = require('@babel/parser');

const t = require('@babel/types');

const _require = require('../scope-hoisting/utils'),
      getName = _require.getName,
      getIdentifier = _require.getIdentifier;

const prelude = getExisting(path.join(__dirname, '../builtins/prelude2.min.js'), path.join(__dirname, '../builtins/prelude2.js'));
const helpers = getExisting(path.join(__dirname, '../builtins/helpers.min.js'), path.join(__dirname, '../builtins/helpers.js'));

class JSConcatPackager extends Packager {
  start() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _this.addedAssets = new Set();
      _this.assets = new Map();
      _this.exposedModules = new Set();
      _this.externalModules = new Set();
      _this.size = 0;
      _this.needsPrelude = false;
      _this.statements = [];
      _this.assetPostludes = new Map();

      var _iterator = _createForOfIteratorHelper(_this.bundle.assets),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          let asset = _step.value;
          // If this module is referenced by another JS bundle, it needs to be exposed externally.
          let isExposed = !Array.from(asset.parentDeps).every(dep => {
            let depAsset = _this.bundler.loadedAssets.get(dep.parent);

            return _this.bundle.assets.has(depAsset) || depAsset.type !== 'js';
          });

          if (isExposed || _this.bundle.entryAsset === asset && _this.bundle.parentBundle && _this.bundle.parentBundle.childBundles.size !== 1) {
            _this.exposedModules.add(asset);

            _this.needsPrelude = true;
          }

          _this.assets.set(asset.id, asset);

          var _iterator2 = _createForOfIteratorHelper(asset.depAssets.values()),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              let mod = _step2.value;

              if (!_this.bundle.assets.has(mod) && _this.options.bundleLoaders[asset.type]) {
                _this.needsPrelude = true;
                break;
              }
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      if (_this.bundle.entryAsset) {
        _this.markUsedExports(_this.bundle.entryAsset);
      }

      if (_this.needsPrelude) {
        if (_this.bundle.entryAsset && _this.options.bundleLoaders[_this.bundle.entryAsset.type]) {
          _this.exposedModules.add(_this.bundle.entryAsset);
        }
      }

      _this.write(helpers.minified);
    })();
  }

  write(string) {
    this.statements.push(...this.parse(string));
  }

  getSize() {
    return this.size;
  }

  markUsedExports(asset) {
    if (asset.usedExports) {
      return;
    }

    asset.usedExports = new Set();

    for (let identifier in asset.cacheData.imports) {
      let _asset$cacheData$impo = (0, _slicedToArray2.default)(asset.cacheData.imports[identifier], 2),
          source = _asset$cacheData$impo[0],
          name = _asset$cacheData$impo[1];

      let dep = asset.depAssets.get(asset.dependencies.get(source));

      if (dep) {
        if (name === '*') {
          this.markUsedExports(dep);
        }

        this.markUsed(dep, name);
      }
    }
  }

  markUsed(mod, name) {
    let _this$findExportModul = this.findExportModule(mod.id, name),
        id = _this$findExportModul.id;

    mod = this.assets.get(id);

    if (!mod) {
      return;
    }

    let exp = mod.cacheData.exports[name];

    if (Array.isArray(exp)) {
      let depMod = mod.depAssets.get(mod.dependencies.get(exp[0]));
      return this.markUsed(depMod, exp[1]);
    }

    this.markUsedExports(mod);
    mod.usedExports.add(name);
  }

  getExportIdentifier(asset) {
    let id = getName(asset, 'exports');

    if (this.shouldWrap(asset)) {
      return `(${getName(asset, 'init')}(), ${id})`;
    }

    return id;
  }

  addAsset(asset) {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this2.addedAssets.has(asset)) {
        return;
      }

      _this2.addedAssets.add(asset);

      let js = asset.generated.js; // If the asset has no side effects according to the its package's sideEffects flag,
      // and there are no used exports marked, exclude the asset from the bundle.

      if (asset.cacheData.sideEffects === false && (!asset.usedExports || asset.usedExports.size === 0)) {
        return;
      }

      var _iterator3 = _createForOfIteratorHelper(asset.depAssets),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          let _step3$value = (0, _slicedToArray2.default)(_step3.value, 2),
              dep = _step3$value[0],
              mod = _step3$value[1];

          if (dep.dynamic) {
            var _iterator4 = _createForOfIteratorHelper(mod.parentBundle.siblingBundles),
                _step4;

            try {
              for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
                let child = _step4.value;

                if (!child.isEmpty) {
                  yield _this2.addBundleLoader(child.type, asset);
                }
              }
            } catch (err) {
              _iterator4.e(err);
            } finally {
              _iterator4.f();
            }

            yield _this2.addBundleLoader(mod.type, asset, true);
          } else {
            // If the dep isn't in this bundle, add it to the list of external modules to preload.
            // Only do this if this is the root JS bundle, otherwise they will have already been
            // loaded in parallel with this bundle as part of a dynamic import.
            if (!_this2.bundle.assets.has(mod) && (!_this2.bundle.parentBundle || _this2.bundle.parentBundle.type !== 'js') && _this2.options.bundleLoaders[mod.type]) {
              _this2.externalModules.add(mod);

              yield _this2.addBundleLoader(mod.type, asset);
            }
          }
        } // if (this.bundle.entryAsset === asset && this.externalModules.size > 0) {
        //   js = `
        //     function $parcel$entry() {
        //       ${js.trim()}
        //     }
        //   `;
        // }
        // js = js.trim() + '\n';

      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }

      _this2.size += js.length;
    })();
  }

  shouldWrap(asset) {
    if (!asset) {
      return false;
    }

    if (asset.cacheData.shouldWrap != null) {
      return asset.cacheData.shouldWrap;
    } // Set to false initially so circular deps work


    asset.cacheData.shouldWrap = false; // We need to wrap if any of the deps are marked by the hoister, e.g.
    // when the dep is required inside a function or conditional.
    // We also need to wrap if any of the parents are wrapped - transitive requires
    // shouldn't be evaluated until their parents are.

    let shouldWrap = [...asset.parentDeps].some(dep => dep.shouldWrap || this.shouldWrap(this.bundler.loadedAssets.get(dep.parent)));
    asset.cacheData.shouldWrap = shouldWrap;
    return shouldWrap;
  }

  addDeps(asset, included) {
    if (!this.bundle.assets.has(asset) || included.has(asset)) {
      return [];
    }

    included.add(asset);
    let depAsts = new Map();

    var _iterator5 = _createForOfIteratorHelper(asset.depAssets.values()),
        _step5;

    try {
      for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
        let depAsset = _step5.value;

        if (!depAsts.has(depAsset)) {
          let depAst = this.addDeps(depAsset, included);
          depAsts.set(depAsset, depAst);
        }
      }
    } catch (err) {
      _iterator5.e(err);
    } finally {
      _iterator5.f();
    }

    let statements;

    if (asset.cacheData.sideEffects === false && (!asset.usedExports || asset.usedExports.size === 0)) {
      statements = [];
    } else {
      statements = this.parse(asset.generated.js, asset.name);
    }

    if (this.shouldWrap(asset)) {
      statements = this.wrapModule(asset, statements);
    }

    if (statements[0]) {
      if (!statements[0].leadingComments) {
        statements[0].leadingComments = [];
      }

      statements[0].leadingComments.push({
        type: 'CommentLine',
        value: ` ASSET: ${path.relative(this.options.rootDir, asset.name)}`
      });
    }

    let statementIndices = new Map();

    for (let i = 0; i < statements.length; i++) {
      let statement = statements[i];

      if (t.isExpressionStatement(statement)) {
        var _iterator6 = _createForOfIteratorHelper(this.findRequires(asset, statement)),
            _step6;

        try {
          for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
            let depAsset = _step6.value;

            if (!statementIndices.has(depAsset)) {
              statementIndices.set(depAsset, i);
            }
          }
        } catch (err) {
          _iterator6.e(err);
        } finally {
          _iterator6.f();
        }
      }
    }

    let reverseDeps = [...asset.depAssets.values()].reverse();

    var _iterator7 = _createForOfIteratorHelper(reverseDeps),
        _step7;

    try {
      for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
        let dep = _step7.value;
        let index = statementIndices.has(dep) ? statementIndices.get(dep) : 0;
        statements.splice(index, 0, ...depAsts.get(dep));
      }
    } catch (err) {
      _iterator7.e(err);
    } finally {
      _iterator7.f();
    }

    if (this.assetPostludes.has(asset)) {
      statements.push(...this.parse(this.assetPostludes.get(asset)));
    }

    return statements;
  }

  wrapModule(asset, statements) {
    let body = [];
    let decls = [];
    let fns = [];

    var _iterator8 = _createForOfIteratorHelper(statements),
        _step8;

    try {
      for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
        let node = _step8.value;

        // Hoist all declarations out of the function wrapper
        // so that they can be referenced by other modules directly.
        if (t.isVariableDeclaration(node)) {
          var _iterator9 = _createForOfIteratorHelper(node.declarations),
              _step9;

          try {
            for (_iterator9.s(); !(_step9 = _iterator9.n()).done;) {
              let decl = _step9.value;

              if (t.isObjectPattern(decl.id) || t.isArrayPattern(decl.id)) {
                for (var _i = 0, _Object$values = Object.values(t.getBindingIdentifiers(decl.id)); _i < _Object$values.length; _i++) {
                  let prop = _Object$values[_i];
                  decls.push(t.variableDeclarator(prop));
                }

                if (decl.init) {
                  body.push(t.expressionStatement(t.assignmentExpression('=', decl.id, decl.init)));
                }
              } else {
                decls.push(t.variableDeclarator(decl.id));

                if (decl.init) {
                  body.push(t.expressionStatement(t.assignmentExpression('=', t.identifier(decl.id.name), decl.init)));
                }
              }
            }
          } catch (err) {
            _iterator9.e(err);
          } finally {
            _iterator9.f();
          }
        } else if (t.isFunctionDeclaration(node)) {
          // Function declarations can be hoisted out of the module initialization function
          fns.push(node);
        } else if (t.isClassDeclaration(node)) {
          // Class declarations are not hoisted. We declare a variable outside the
          // function convert to a class expression assignment.
          decls.push(t.variableDeclarator(t.identifier(node.id.name)));
          body.push(t.expressionStatement(t.assignmentExpression('=', t.identifier(node.id.name), t.toExpression(node))));
        } else {
          body.push(node);
        }
      }
    } catch (err) {
      _iterator8.e(err);
    } finally {
      _iterator8.f();
    }

    let executed = getName(asset, 'executed');
    decls.push(t.variableDeclarator(t.identifier(executed), t.booleanLiteral(false)));
    let init = t.functionDeclaration(getIdentifier(asset, 'init'), [], t.blockStatement([t.ifStatement(t.identifier(executed), t.returnStatement()), t.expressionStatement(t.assignmentExpression('=', t.identifier(executed), t.booleanLiteral(true))), ...body]));
    return [t.variableDeclaration('var', decls), ...fns, init];
  }

  parse(code, filename) {
    let ast = babylon.parse(code, {
      sourceFilename: filename,
      allowReturnOutsideFunction: true
    });
    return ast.program.body;
  }

  findRequires(asset, ast) {
    let result = [];
    walk.simple(ast, {
      CallExpression(node) {
        let args = node.arguments,
            callee = node.callee;

        if (!t.isIdentifier(callee)) {
          return;
        }

        if (callee.name === '$parcel$require') {
          result.push(asset.depAssets.get(asset.dependencies.get(args[1].value)));
        }
      }

    });
    return result;
  }

  getBundleSpecifier(bundle) {
    let name = path.relative(path.dirname(this.bundle.name), bundle.name);

    if (bundle.entryAsset) {
      return [name, bundle.entryAsset.id];
    }

    return name;
  }

  addAssetToBundle(asset) {
    var _this3 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this3.bundle.assets.has(asset)) {
        return;
      }

      _this3.assets.set(asset.id, asset);

      _this3.bundle.addAsset(asset);

      if (!asset.parentBundle) {
        asset.parentBundle = _this3.bundle;
      } // Add all dependencies as well


      var _iterator10 = _createForOfIteratorHelper(asset.depAssets.values()),
          _step10;

      try {
        for (_iterator10.s(); !(_step10 = _iterator10.n()).done;) {
          let child = _step10.value;
          yield _this3.addAssetToBundle(child, _this3.bundle);
        }
      } catch (err) {
        _iterator10.e(err);
      } finally {
        _iterator10.f();
      }

      yield _this3.addAsset(asset);
    })();
  }

  addBundleLoader(bundleType, parentAsset, dynamic) {
    var _this4 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let loader = _this4.options.bundleLoaders[bundleType];

      if (!loader) {
        return;
      }

      let bundleLoader = _this4.bundler.loadedAssets.get(require.resolve('../builtins/bundle-loader'));

      if (!bundleLoader && !dynamic) {
        bundleLoader = yield _this4.bundler.getAsset('_bundle_loader');
      }

      if (bundleLoader) {
        // parentAsset.depAssets.set({name: '_bundle_loader'}, bundleLoader);
        yield _this4.addAssetToBundle(bundleLoader);
      } else {
        return;
      }

      let target = _this4.options.target === 'node' ? 'node' : 'browser';
      let asset = yield _this4.bundler.getAsset(loader[target]);

      if (!_this4.bundle.assets.has(asset)) {
        let dep = {
          name: asset.name
        };
        asset.parentDeps.add(dep);
        parentAsset.dependencies.set(dep.name, dep);
        parentAsset.depAssets.set(dep, asset);

        _this4.assetPostludes.set(asset, `${_this4.getExportIdentifier(bundleLoader)}.register(${JSON.stringify(bundleType)},${_this4.getExportIdentifier(asset)});\n`);

        yield _this4.addAssetToBundle(asset);
      }
    })();
  }

  end() {
    var _superprop_getWrite = () => super.write,
        _superprop_getEnd = () => super.end,
        _this5 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let included = new Set();

      var _iterator11 = _createForOfIteratorHelper(_this5.bundle.assets),
          _step11;

      try {
        for (_iterator11.s(); !(_step11 = _iterator11.n()).done;) {
          let asset = _step11.value;

          _this5.statements.push(..._this5.addDeps(asset, included));
        } // Preload external modules before running entry point if needed

      } catch (err) {
        _iterator11.e(err);
      } finally {
        _iterator11.f();
      }

      if (_this5.externalModules.size > 0) {
        let bundleLoader = _this5.bundler.loadedAssets.get(require.resolve('../builtins/bundle-loader'));

        let preload = [];

        var _iterator12 = _createForOfIteratorHelper(_this5.externalModules),
            _step12;

        try {
          for (_iterator12.s(); !(_step12 = _iterator12.n()).done;) {
            let mod = _step12.value;
            // Find the bundle that has the module as its entry point
            let bundle = Array.from(mod.bundles).find(b => b.entryAsset === mod);

            if (bundle) {
              preload.push([path.basename(bundle.name), mod.id]);
            }
          }
        } catch (err) {
          _iterator12.e(err);
        } finally {
          _iterator12.f();
        }

        let loads = `${_this5.getExportIdentifier(bundleLoader)}.load(${JSON.stringify(preload)})`;

        if (_this5.bundle.entryAsset) {
          loads += '.then($parcel$entry)';
        }

        loads += ';';

        _this5.write(loads);
      }

      let entryExports = _this5.bundle.entryAsset && _this5.getExportIdentifier(_this5.bundle.entryAsset);

      if (entryExports && _this5.bundle.entryAsset.generated.js.includes(entryExports)) {
        _this5.write(`
        if (typeof exports === "object" && typeof module !== "undefined") {
          // CommonJS
          module.exports = ${entryExports};
        } else if (typeof define === "function" && define.amd) {
          // RequireJS
          define(function () {
            return ${entryExports};
          });
        } ${_this5.options.global ? `else {
          // <script>
          this[${JSON.stringify(_this5.options.global)}] = ${entryExports};
        }` : ''}
      `);
      }

      if (_this5.needsPrelude) {
        let exposed = [];
        let prepareModule = [];

        var _iterator13 = _createForOfIteratorHelper(_this5.exposedModules),
            _step13;

        try {
          for (_iterator13.s(); !(_step13 = _iterator13.n()).done;) {
            let m = _step13.value;

            if (m.cacheData.isES6Module) {
              prepareModule.push(`${_this5.getExportIdentifier(m)}.__esModule = true;`);
            }

            exposed.push(`"${m.id}": ${_this5.getExportIdentifier(m)}`);
          }
        } catch (err) {
          _iterator13.e(err);
        } finally {
          _iterator13.f();
        }

        _this5.write(`
        ${prepareModule.join('\n')}
        return {${exposed.join(', ')}};
      `);
      }

      try {
        let ast = t.file(t.program(_this5.statements));

        let _concat = concat(_this5, ast),
            output = _concat.code;

        if (!_this5.options.minify) {
          output = '\n' + output + '\n';
        }

        let preludeCode = _this5.options.minify ? prelude.minified : prelude.source;

        if (_this5.needsPrelude) {
          output = preludeCode + '(function (require) {' + output + '});';
        } else {
          output = '(function () {' + output + '})();';
        }

        _this5.size = output.length;
        let sourceMaps = _this5.options.sourceMaps;

        if (sourceMaps) {
          // Add source map url if a map bundle exists
          let mapBundle = _this5.bundle.siblingBundlesMap.get('map');

          if (mapBundle) {
            let mapUrl = urlJoin(_this5.options.publicURL, path.basename(mapBundle.name));
            output += `\n//# sourceMappingURL=${mapUrl}`;
          }
        }

        yield _superprop_getWrite().call(_this5, output);
      } catch (e) {
        throw e;
      } finally {
        yield _superprop_getEnd().call(_this5);
      }
    })();
  }

  resolveModule(id, name) {
    let module = this.assets.get(id);
    return module.depAssets.get(module.dependencies.get(name));
  }

  findExportModule(id, name, replacements) {
    let asset = this.assets.get(id);
    let exp = asset && Object.prototype.hasOwnProperty.call(asset.cacheData.exports, name) ? asset.cacheData.exports[name] : null; // If this is a re-export, find the original module.

    if (Array.isArray(exp)) {
      let mod = this.resolveModule(id, exp[0]);
      return this.findExportModule(mod.id, exp[1], replacements);
    } // If this module exports wildcards, resolve the original module.
    // Default exports are excluded from wildcard exports.


    let wildcards = asset && asset.cacheData.wildcards;

    if (wildcards && name !== 'default' && name !== '*') {
      var _iterator14 = _createForOfIteratorHelper(wildcards),
          _step14;

      try {
        for (_iterator14.s(); !(_step14 = _iterator14.n()).done;) {
          let source = _step14.value;
          let mod = this.resolveModule(id, source);
          let m = this.findExportModule(mod.id, name, replacements);

          if (m.identifier) {
            return m;
          }
        }
      } catch (err) {
        _iterator14.e(err);
      } finally {
        _iterator14.f();
      }
    } // If this is a wildcard import, resolve to the exports object.


    if (asset && name === '*') {
      exp = getName(asset, 'exports');
    }

    if (replacements && replacements.has(exp)) {
      exp = replacements.get(exp);
    }

    return {
      identifier: exp,
      name,
      id
    };
  }

}

module.exports = JSConcatPackager;