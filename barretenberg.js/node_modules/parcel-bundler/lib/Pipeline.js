"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const Parser = require('./Parser');

const path = require('path');

const _require = require('@parcel/utils'),
      errorUtils = _require.errorUtils;
/**
 * A Pipeline composes multiple Asset types together.
 */


class Pipeline {
  constructor(options) {
    this.options = options;
    this.parser = new Parser(options);
  }

  process(path, isWarmUp) {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      let options = _this.options;

      if (isWarmUp) {
        options = Object.assign({
          isWarmUp
        }, options);
      }

      let asset = _this.parser.getAsset(path, options);

      let error = null;
      let generatedMap = {};

      try {
        let generated = yield _this.processAsset(asset);

        var _iterator = _createForOfIteratorHelper(generated),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            let rendition = _step.value;
            generatedMap[rendition.type] = rendition.value;
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      } catch (err) {
        error = errorUtils.errorToJson(err);
        error.fileName = path;
      }

      return {
        id: asset.id,
        dependencies: Array.from(asset.dependencies.values()),
        generated: generatedMap,
        sourceMaps: asset.sourceMaps,
        error: error,
        hash: asset.hash,
        cacheData: asset.cacheData
      };
    })();
  }

  processAsset(asset) {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      try {
        yield asset.process();
      } catch (err) {
        throw asset.generateErrorMessage(err);
      }

      let inputType = path.extname(asset.name).slice(1);
      let generated = [];

      var _iterator2 = _createForOfIteratorHelper(_this2.iterateRenditions(asset)),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          let rendition = _step2.value;
          let type = rendition.type,
              value = rendition.value;

          if (typeof value !== 'string' || rendition.final) {
            generated.push(rendition);
            continue;
          } // Find an asset type for the rendition type.
          // If the asset is not already an instance of this asset type, process it.


          let AssetType = _this2.parser.findParser(asset.name.slice(0, -inputType.length) + type, true);

          if (!(asset instanceof AssetType)) {
            let opts = Object.assign({}, asset.options, {
              rendition
            });
            let subAsset = new AssetType(asset.name, opts);
            subAsset.id = asset.id;
            subAsset.contents = value;
            subAsset.dependencies = asset.dependencies;
            subAsset.cacheData = Object.assign(asset.cacheData, subAsset.cacheData);
            let processed = yield _this2.processAsset(subAsset);

            if (rendition.meta) {
              var _iterator4 = _createForOfIteratorHelper(processed),
                  _step4;

              try {
                for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
                  let res = _step4.value;
                  res.meta = rendition.meta;
                  res.isMain = res.type === subAsset.type;
                }
              } catch (err) {
                _iterator4.e(err);
              } finally {
                _iterator4.f();
              }
            }

            generated = generated.concat(processed);
          } else {
            generated.push(rendition);
          }
        } // Post process. This allows assets a chance to modify the output produced by sub-asset types.

      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      try {
        generated = yield asset.postProcess(generated);
      } catch (err) {
        throw asset.generateErrorMessage(err);
      }

      let hasMap = false;
      let sourceMaps = {};

      var _iterator3 = _createForOfIteratorHelper(generated),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          let rendition = _step3.value;

          if (rendition.map && rendition.type == asset.type) {
            sourceMaps[rendition.type] = rendition.map;
            hasMap = true;
          }
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }

      if (hasMap) {
        asset.sourceMaps = sourceMaps;
      }

      asset.generated = generated;
      asset.hash = yield asset.generateHash();
      return generated;
    })();
  }

  *iterateRenditions(asset) {
    if (Array.isArray(asset.generated)) {
      return yield* asset.generated;
    }

    if (typeof asset.generated === 'string') {
      return yield {
        type: asset.type,
        value: asset.generated
      };
    } // Backward compatibility support for the old API.
    // Assume all renditions are final - don't compose asset types together.


    for (let type in asset.generated) {
      yield {
        type,
        value: asset.generated[type],
        // for scope hoisting, we need to post process all JS
        final: !(type === 'js' && this.options.scopeHoist)
      };
    }
  }

}

module.exports = Pipeline;