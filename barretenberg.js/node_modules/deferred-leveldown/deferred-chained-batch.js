'use strict'

const { AbstractChainedBatch } = require('abstract-leveldown')
const kOperations = Symbol('operations')

module.exports = class DeferredChainedBatch extends AbstractChainedBatch {
  constructor (db) {
    super(db)
    this[kOperations] = []
  }

  _put (key, value, options) {
    this[kOperations].push({ ...options, type: 'put', key, value })
  }

  _del (key, options) {
    this[kOperations].push({ ...options, type: 'del', key })
  }

  _clear () {
    this[kOperations] = []
  }

  _write (options, callback) {
    // AbstractChainedBatch would call _batch(), we call batch()
    this.db.batch(this[kOperations], options, callback)
  }
}
