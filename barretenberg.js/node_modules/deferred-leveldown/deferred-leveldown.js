'use strict'

const { AbstractLevelDOWN } = require('abstract-leveldown')
const inherits = require('inherits')
const DeferredIterator = require('./deferred-iterator')
const DeferredChainedBatch = require('./deferred-chained-batch')
const getCallback = require('./util').getCallback

const deferrables = ['put', 'get', 'getMany', 'del', 'batch', 'clear']
const optionalDeferrables = ['approximateSize', 'compactRange']

const kInnerDb = Symbol('innerDb')
const kOperations = Symbol('operations')
const kPromise = Symbol('promise')

function DeferredLevelDOWN (db) {
  AbstractLevelDOWN.call(this, db.supports || {})

  // TODO (future major): remove this fallback; db must have manifest that
  // declares approximateSize and compactRange in additionalMethods.
  for (const m of optionalDeferrables) {
    if (typeof db[m] === 'function' && !this.supports.additionalMethods[m]) {
      this.supports.additionalMethods[m] = true
    }
  }

  this[kInnerDb] = db
  this[kOperations] = []

  implement(this)
}

inherits(DeferredLevelDOWN, AbstractLevelDOWN)

DeferredLevelDOWN.prototype.type = 'deferred-leveldown'

// Backwards compatibility for reachdown and subleveldown
Object.defineProperty(DeferredLevelDOWN.prototype, '_db', {
  enumerable: true,
  get () {
    return this[kInnerDb]
  }
})

DeferredLevelDOWN.prototype._open = function (options, callback) {
  const onopen = (err) => {
    if (err || this[kInnerDb].status !== 'open') {
      // TODO: reject scheduled operations
      return callback(err || new Error('Database is not open'))
    }

    const operations = this[kOperations]
    this[kOperations] = []

    for (const op of operations) {
      if (op.iterator) {
        op.iterator.setDb(this[kInnerDb])
      } else {
        this[kInnerDb][op.method](...op.args)
      }
    }

    /* istanbul ignore if: assertion */
    if (this[kOperations].length > 0) {
      throw new Error('Did not expect further operations')
    }

    callback()
  }

  if (this[kInnerDb].status === 'new' || this[kInnerDb].status === 'closed') {
    this[kInnerDb].open(options, onopen)
  } else {
    this._nextTick(onopen)
  }
}

DeferredLevelDOWN.prototype._close = function (callback) {
  this[kInnerDb].close(callback)
}

DeferredLevelDOWN.prototype._isOperational = function () {
  return this.status === 'opening'
}

function implement (self) {
  const additionalMethods = Object.keys(self.supports.additionalMethods)

  for (const method of deferrables.concat(additionalMethods)) {
    // Override the public rather than private methods to cover cases where abstract-leveldown
    // has a fast-path like on db.batch([]) which bypasses _batch() because the array is empty.
    self[method] = function (...args) {
      if (method === 'batch' && args.length === 0) {
        return new DeferredChainedBatch(this)
      } else if (this.status === 'open') {
        return this[kInnerDb][method](...args)
      }

      const callback = getCallback(args, kPromise)

      if (this.status === 'opening') {
        this[kOperations].push({ method, args })
      } else {
        this._nextTick(callback, new Error('Database is not open'))
      }

      return callback[kPromise]
    }
  }

  self.iterator = function (options) {
    if (this.status === 'open') {
      return this[kInnerDb].iterator(options)
    } else if (this.status === 'opening') {
      const iterator = new DeferredIterator(this, options)
      this[kOperations].push({ iterator })
      return iterator
    } else {
      throw new Error('Database is not open')
    }
  }

  for (const method of deferrables.concat(['iterator'])) {
    self['_' + method] = function () {
      /* istanbul ignore next: assertion */
      throw new Error('Did not expect private method to be called: ' + method)
    }
  }
}

module.exports = DeferredLevelDOWN
module.exports.DeferredIterator = DeferredIterator
