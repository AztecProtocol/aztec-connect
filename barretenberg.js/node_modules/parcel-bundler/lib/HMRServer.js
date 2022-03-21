"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }

const http = require('http');

const https = require('https');

const WebSocket = require('ws');

const generateCertificate = require('./utils/generateCertificate');

const getCertificate = require('./utils/getCertificate');

const logger = require('@parcel/logger');

class HMRServer {
  start(options = {}) {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      yield new Promise( /*#__PURE__*/function () {
        var _ref = (0, _asyncToGenerator2.default)(function* (resolve) {
          if (!options.https) {
            _this.server = http.createServer();
          } else if (typeof options.https === 'boolean') {
            _this.server = https.createServer(generateCertificate(options));
          } else {
            _this.server = https.createServer(yield getCertificate(options.https));
          }

          let websocketOptions = {
            server: _this.server
          };

          if (options.hmrHostname) {
            websocketOptions.origin = `${options.https ? 'https' : 'http'}://${options.hmrHostname}`;
          }

          _this.wss = new WebSocket.Server(websocketOptions);

          _this.server.listen(options.hmrPort, resolve);
        });

        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }());

      _this.wss.on('connection', ws => {
        ws.onerror = _this.handleSocketError;

        if (_this.unresolvedError) {
          ws.send(JSON.stringify(_this.unresolvedError));
        }
      });

      _this.wss.on('error', _this.handleSocketError);

      return _this.wss._server.address().port;
    })();
  }

  stop() {
    this.wss.close();
    this.server.close();
  }

  emitError(err) {
    let _logger$formatError = logger.formatError(err),
        message = _logger$formatError.message,
        stack = _logger$formatError.stack; // store the most recent error so we can notify new connections
    // and so we can broadcast when the error is resolved


    this.unresolvedError = {
      type: 'error',
      error: {
        message,
        stack
      }
    };
    this.broadcast(this.unresolvedError);
  }

  emitUpdate(assets, reload = false) {
    if (this.unresolvedError) {
      this.unresolvedError = null;
      this.broadcast({
        type: 'error-resolved'
      });
    }

    const shouldReload = reload || assets.some(asset => asset.hmrPageReload);

    if (shouldReload) {
      this.broadcast({
        type: 'reload'
      });
    } else {
      this.broadcast({
        type: 'update',
        assets: assets.map(asset => {
          let deps = {};

          var _iterator = _createForOfIteratorHelper(asset.depAssets),
              _step;

          try {
            for (_iterator.s(); !(_step = _iterator.n()).done;) {
              let _step$value = (0, _slicedToArray2.default)(_step.value, 2),
                  dep = _step$value[0],
                  depAsset = _step$value[1];

              deps[dep.name] = depAsset.id;
            }
          } catch (err) {
            _iterator.e(err);
          } finally {
            _iterator.f();
          }

          return {
            id: asset.id,
            type: asset.type,
            generated: asset.generated,
            deps: deps
          };
        })
      });
    }
  }

  handleSocketError(err) {
    if (err.error.code === 'ECONNRESET') {
      // This gets triggered on page refresh, ignore this
      return;
    }

    logger.warn(err);
  }

  broadcast(msg) {
    const json = JSON.stringify(msg);

    var _iterator2 = _createForOfIteratorHelper(this.wss.clients),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        let ws = _step2.value;
        ws.send(json);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  }

}

module.exports = HMRServer;