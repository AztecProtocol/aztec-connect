"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const path = require('path');

const Packager = require('./Packager');

const getExisting = require('../utils/getExisting');

const urlJoin = require('../utils/urlJoin');

const lineCounter = require('../utils/lineCounter');

const objectHash = require('../utils/objectHash');

const prelude = getExisting(path.join(__dirname, '../builtins/prelude.min.js'), path.join(__dirname, '../builtins/prelude.js'));

class JSPackager extends Packager {
  start() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      _this.first = true;
      _this.dedupe = new Map();
      _this.bundleLoaders = new Set();
      _this.externalModules = new Set();
      let preludeCode = _this.options.minify ? prelude.minified : prelude.source;

      if (_this.options.target === 'electron') {
        preludeCode = `process.env.HMR_PORT=${_this.options.hmrPort};process.env.HMR_HOSTNAME=${JSON.stringify(_this.options.hmrHostname)};` + preludeCode;
      }

      yield _this.write(preludeCode + '({');
      _this.lineOffset = lineCounter(preludeCode);
    })();
  }

  addAsset(asset) {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      // If this module is referenced by another JS bundle, it needs to be exposed externally.
      // In that case, don't dedupe the asset as it would affect the module ids that are referenced by other bundles.
      let isExposed = !Array.from(asset.parentDeps).every(dep => {
        let depAsset = _this2.bundler.loadedAssets.get(dep.parent);

        return _this2.bundle.assets.has(depAsset) || depAsset.type !== 'js';
      });

      if (!isExposed) {
        let key = _this2.dedupeKey(asset);

        if (_this2.dedupe.has(key)) {
          return;
        } // Don't dedupe when HMR is turned on since it messes with the asset ids


        if (!_this2.options.hmr) {
          _this2.dedupe.set(key, asset.id);
        }
      }

      let deps = {};

      var _iterator = _createForOfIteratorHelper(asset.depAssets),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          let _step$value = (0, _slicedToArray2.default)(_step.value, 2),
              dep = _step$value[0],
              mod = _step$value[1];

          // For dynamic dependencies, list the child bundles to load along with the module id
          if (dep.dynamic) {
            let bundles = [_this2.getBundleSpecifier(mod.parentBundle)];

            var _iterator2 = _createForOfIteratorHelper(mod.parentBundle.siblingBundles),
                _step2;

            try {
              for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
                let child = _step2.value;

                if (!child.isEmpty) {
                  bundles.push(_this2.getBundleSpecifier(child));

                  _this2.bundleLoaders.add(child.type);
                }
              }
            } catch (err) {
              _iterator2.e(err);
            } finally {
              _iterator2.f();
            }

            bundles.push(mod.id);
            deps[dep.name] = bundles;

            _this2.bundleLoaders.add(mod.type);
          } else {
            deps[dep.name] = _this2.dedupe.get(_this2.dedupeKey(mod)) || mod.id; // If the dep isn't in this bundle, add it to the list of external modules to preload.
            // Only do this if this is the root JS bundle, otherwise they will have already been
            // loaded in parallel with this bundle as part of a dynamic import.

            if (!_this2.bundle.assets.has(mod)) {
              _this2.externalModules.add(mod);

              if (!_this2.bundle.parentBundle || _this2.bundle.isolated || _this2.bundle.parentBundle.type !== 'js') {
                _this2.bundleLoaders.add(mod.type);
              }
            }
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      _this2.bundle.addOffset(asset, _this2.lineOffset);

      yield _this2.writeModule(asset.id, asset.generated.js, deps, asset.generated.map);
    })();
  }

  getBundleSpecifier(bundle) {
    let name = path.relative(path.dirname(this.bundle.name), bundle.name);

    if (bundle.entryAsset) {
      return [name, bundle.entryAsset.id];
    }

    return name;
  }

  dedupeKey(asset) {
    // cannot rely *only* on generated JS for deduplication because paths like
    // `../` can cause 2 identical JS files to behave differently depending on
    // where they are located on the filesystem
    let deps = Array.from(asset.depAssets.values(), dep => dep.name).sort();
    return objectHash([asset.generated.js, deps]);
  }

  writeModule(id, code, deps = {}, map) {
    var _this3 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let wrapped = _this3.first ? '' : ',';
      wrapped += JSON.stringify(id) + ':[function(require,module,exports) {\n' + (code || '') + '\n},';
      wrapped += JSON.stringify(deps);
      wrapped += ']';
      _this3.first = false;
      yield _this3.write(wrapped); // Use the pre-computed line count from the source map if possible

      let lineCount = map && map.lineCount ? map.lineCount : lineCounter(code);
      _this3.lineOffset += 1 + lineCount;
    })();
  }

  addAssetToBundle(asset) {
    var _this4 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this4.bundle.assets.has(asset)) {
        return;
      }

      _this4.bundle.addAsset(asset);

      if (!asset.parentBundle) {
        asset.parentBundle = _this4.bundle;
      } // Add all dependencies as well


      var _iterator3 = _createForOfIteratorHelper(asset.depAssets.values()),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          let child = _step3.value;
          yield _this4.addAssetToBundle(child);
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }

      yield _this4.addAsset(asset);
    })();
  }

  writeBundleLoaders() {
    var _this5 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      if (_this5.bundleLoaders.size === 0) {
        return false;
      }

      let bundleLoader = _this5.bundler.loadedAssets.get(require.resolve('../builtins/bundle-loader'));

      if (_this5.externalModules.size > 0 && !bundleLoader) {
        bundleLoader = yield _this5.bundler.getAsset('_bundle_loader');
      }

      if (bundleLoader) {
        yield _this5.addAssetToBundle(bundleLoader);
      } else {
        return;
      } // Generate a module to register the bundle loaders that are needed


      let loads = 'var b=require(' + JSON.stringify(bundleLoader.id) + ');';

      var _iterator4 = _createForOfIteratorHelper(_this5.bundleLoaders),
          _step4;

      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          let bundleType = _step4.value;
          let loader = _this5.options.bundleLoaders[bundleType];

          if (loader) {
            let target = _this5.options.target === 'node' ? 'node' : 'browser';
            let asset = yield _this5.bundler.getAsset(loader[target]);
            yield _this5.addAssetToBundle(asset);
            loads += 'b.register(' + JSON.stringify(bundleType) + ',require(' + JSON.stringify(asset.id) + '));';
          }
        } // Preload external modules before running entry point if needed

      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }

      if (_this5.externalModules.size > 0) {
        let preload = [];

        var _iterator5 = _createForOfIteratorHelper(_this5.externalModules),
            _step5;

        try {
          for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
            let mod = _step5.value;
            // Find the bundle that has the module as its entry point
            let bundle = Array.from(mod.bundles).find(b => b.entryAsset === mod);

            if (bundle) {
              preload.push([path.basename(bundle.name), mod.id]);
            }
          }
        } catch (err) {
          _iterator5.e(err);
        } finally {
          _iterator5.f();
        }

        loads += 'b.load(' + JSON.stringify(preload) + ')';

        if (_this5.bundle.entryAsset) {
          loads += `.then(function(){require(${JSON.stringify(_this5.bundle.entryAsset.id)});})`;
        }

        loads += ';';
      } // Asset ids normally start at 1, so this should be safe.


      yield _this5.writeModule(0, loads, {});
      return true;
    })();
  }

  end() {
    var _superprop_getEnd = () => super.end,
        _this6 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let entry = []; // Add the HMR runtime if needed.

      if (_this6.options.hmr) {
        let asset = yield _this6.bundler.getAsset(require.resolve('../builtins/hmr-runtime'));
        yield _this6.addAssetToBundle(asset);
        entry.push(asset.id);
      }

      if (yield _this6.writeBundleLoaders()) {
        entry.push(0);
      }

      if (_this6.bundle.entryAsset && _this6.externalModules.size === 0) {
        entry.push(_this6.bundle.entryAsset.id);
      }

      yield _this6.write('},{},' + JSON.stringify(entry) + ', ' + JSON.stringify(_this6.options.global || null) + ')');

      if (_this6.options.sourceMaps) {
        // Add source map url if a map bundle exists
        let mapBundle = _this6.bundle.siblingBundlesMap.get('map');

        if (mapBundle) {
          let mapUrl = urlJoin(_this6.options.publicURL, path.relative(_this6.options.outDir, mapBundle.name));
          yield _this6.write(`\n//# sourceMappingURL=${mapUrl}`);
        }
      }

      yield _superprop_getEnd().call(_this6);
    })();
  }

}

module.exports = JSPackager;