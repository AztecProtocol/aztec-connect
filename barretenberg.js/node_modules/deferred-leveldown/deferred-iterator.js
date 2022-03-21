'use strict'

const { AbstractIterator } = require('abstract-leveldown')
const inherits = require('inherits')
const getCallback = require('./util').getCallback

const kOptions = Symbol('options')
const kIterator = Symbol('iterator')
const kOperations = Symbol('operations')
const kPromise = Symbol('promise')

function DeferredIterator (db, options) {
  AbstractIterator.call(this, db)

  this[kOptions] = options
  this[kIterator] = null
  this[kOperations] = []
}

inherits(DeferredIterator, AbstractIterator)

DeferredIterator.prototype.setDb = function (db) {
  this[kIterator] = db.iterator(this[kOptions])

  for (const op of this[kOperations].splice(0, this[kOperations].length)) {
    this[kIterator][op.method](...op.args)
  }
}

DeferredIterator.prototype.next = function (...args) {
  if (this.db.status === 'open') {
    return this[kIterator].next(...args)
  }

  const callback = getCallback(args, kPromise, function map (key, value) {
    if (key === undefined && value === undefined) {
      return undefined
    } else {
      return [key, value]
    }
  })

  if (this.db.status === 'opening') {
    this[kOperations].push({ method: 'next', args })
  } else {
    this._nextTick(callback, new Error('Database is not open'))
  }

  return callback[kPromise] || this
}

DeferredIterator.prototype.seek = function (...args) {
  if (this.db.status === 'open') {
    this[kIterator].seek(...args)
  } else if (this.db.status === 'opening') {
    this[kOperations].push({ method: 'seek', args })
  } else {
    throw new Error('Database is not open')
  }
}

DeferredIterator.prototype.end = function (...args) {
  if (this.db.status === 'open') {
    return this[kIterator].end(...args)
  }

  const callback = getCallback(args, kPromise)

  if (this.db.status === 'opening') {
    this[kOperations].push({ method: 'end', args })
  } else {
    this._nextTick(callback, new Error('Database is not open'))
  }

  return callback[kPromise] || this
}

for (const method of ['next', 'seek', 'end']) {
  DeferredIterator.prototype['_' + method] = function () {
    /* istanbul ignore next: assertion */
    throw new Error('Did not expect private method to be called: ' + method)
  }
}

module.exports = DeferredIterator
