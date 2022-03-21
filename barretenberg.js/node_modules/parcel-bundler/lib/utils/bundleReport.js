"use strict";

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const path = require('path');

const prettifyTime = require('./prettifyTime');

const logger = require('@parcel/logger');

const filesize = require('filesize');

const LARGE_BUNDLE_SIZE = 1024 * 1024;
const DEFAULT_NUM_LARGE_ASSETS = 10;
const COLUMNS = [{
  align: 'left'
}, // name
{
  align: 'right'
}, // size
{
  align: 'right'
} // time
];

function bundleReport(mainBundle, detailed = false) {
  // Get a list of bundles sorted by size
  let bundles = Array.from(iterateBundles(mainBundle)).sort((a, b) => b.totalSize - a.totalSize);
  let rows = [];

  var _iterator = _createForOfIteratorHelper(bundles),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      let bundle = _step.value;
      // Add a row for the bundle
      rows.push([formatFilename(bundle.name, logger.chalk.cyan.bold), logger.chalk.bold(prettifySize(bundle.totalSize, bundle.totalSize > LARGE_BUNDLE_SIZE)), logger.chalk.green.bold(prettifyTime(bundle.bundleTime))]); // If detailed, generate a list of the largest assets in the bundle

      if (detailed && bundle.assets.size > 1) {
        let assets = Array.from(bundle.assets).filter(a => a.type === bundle.type).sort((a, b) => b.bundledSize - a.bundledSize);

        let largestAssets = (() => {
          if (detailed === 'all') {
            return assets;
          }

          return assets.slice(0, isNaN(detailed) || typeof detailed === 'boolean' ? DEFAULT_NUM_LARGE_ASSETS : parseInt(detailed, 10));
        })();

        var _iterator2 = _createForOfIteratorHelper(largestAssets),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            let asset = _step2.value;
            // Add a row for the asset.
            rows.push([(asset == assets[assets.length - 1] ? '└── ' : '├── ') + formatFilename(asset.name, logger.chalk.reset), logger.chalk.dim(prettifySize(asset.bundledSize)), logger.chalk.dim(logger.chalk.green(prettifyTime(asset.buildTime)))]);
          } // Show how many more assets there are

        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }

        if (assets.length > largestAssets.length) {
          rows.push(['└── ' + logger.chalk.dim(`+ ${assets.length - largestAssets.length} more assets`)]);
        } // If this isn't the last bundle, add an empty row before the next one


        if (bundle !== bundles[bundles.length - 1]) {
          rows.push([]);
        }
      }
    } // Render table

  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  logger.log('');
  logger.table(COLUMNS, rows);
}

module.exports = bundleReport;

function* iterateBundles(bundle) {
  if (!bundle.isEmpty) {
    yield bundle;
  }

  var _iterator3 = _createForOfIteratorHelper(bundle.childBundles),
      _step3;

  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      let child = _step3.value;
      yield* iterateBundles(child);
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
}

function prettifySize(size, isLarge) {
  let res = filesize(size);

  if (isLarge) {
    return logger.chalk.yellow(logger.emoji.warning + '  ' + res);
  }

  return logger.chalk.magenta(res);
}

function formatFilename(filename, color = logger.chalk.reset) {
  let dir = path.relative(process.cwd(), path.dirname(filename));
  return logger.chalk.dim(dir + (dir ? path.sep : '')) + color(path.basename(filename));
}