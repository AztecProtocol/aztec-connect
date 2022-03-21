'use strict'

const inherits = require('inherits')
const { AbstractLevelDOWN, AbstractIterator } = require('abstract-leveldown')
const ltgt = require('ltgt')
const createRBT = require('functional-red-black-tree')
const { Buffer } = require('buffer')

const rangeOptions = ['gt', 'gte', 'lt', 'lte']
const kNone = Symbol('none')
const kKeys = Symbol('keys')
const kValues = Symbol('values')
const kIncrement = Symbol('increment')

// TODO (perf): replace ltgt.compare with a simpler, buffer-only comparator
function gt (value) {
  return ltgt.compare(value, this._upperBound) > 0
}

function gte (value) {
  return ltgt.compare(value, this._upperBound) >= 0
}

function lt (value) {
  return ltgt.compare(value, this._upperBound) < 0
}

function lte (value) {
  return ltgt.compare(value, this._upperBound) <= 0
}

function MemIterator (db, options) {
  AbstractIterator.call(this, db)
  this._limit = options.limit

  if (this._limit === -1) this._limit = Infinity

  const tree = db._store

  this.keyAsBuffer = options.keyAsBuffer !== false
  this.valueAsBuffer = options.valueAsBuffer !== false
  this[kKeys] = options.keys
  this[kValues] = options.values
  this._reverse = options.reverse
  this._options = options
  this._done = 0

  if (!this._reverse) {
    this._incr = 'next'
    this._lowerBound = ltgt.lowerBound(options, kNone)
    this._upperBound = ltgt.upperBound(options, kNone)

    if (this._lowerBound === kNone) {
      this._tree = tree.begin
    } else if (ltgt.lowerBoundInclusive(options)) {
      this._tree = tree.ge(this._lowerBound)
    } else {
      this._tree = tree.gt(this._lowerBound)
    }

    if (this._upperBound !== kNone) {
      if (ltgt.upperBoundInclusive(options)) {
        this._test = lte
      } else {
        this._test = lt
      }
    }
  } else {
    this._incr = 'prev'
    this._lowerBound = ltgt.upperBound(options, kNone)
    this._upperBound = ltgt.lowerBound(options, kNone)

    if (this._lowerBound === kNone) {
      this._tree = tree.end
    } else if (ltgt.upperBoundInclusive(options)) {
      this._tree = tree.le(this._lowerBound)
    } else {
      this._tree = tree.lt(this._lowerBound)
    }

    if (this._upperBound !== kNone) {
      if (ltgt.lowerBoundInclusive(options)) {
        this._test = gte
      } else {
        this._test = gt
      }
    }
  }
}

inherits(MemIterator, AbstractIterator)

MemIterator.prototype._next = function (callback) {
  if (!this[kIncrement]()) return this._nextTick(callback)
  if (!this._tree.valid) return this._nextTick(callback)

  let key = this._tree.key
  let value = this._tree.value

  if (!this._test(key)) return this._nextTick(callback)

  key = !this[kKeys] ? undefined : this.keyAsBuffer ? key : key.toString()
  value = !this[kValues] ? undefined : this.valueAsBuffer ? value : value.toString()

  this._tree[this._incr]()
  this._nextTick(callback, null, key, value)
}

MemIterator.prototype[kIncrement] = function () {
  return this._done++ < this._limit
}

MemIterator.prototype._test = function () {
  return true
}

MemIterator.prototype._outOfRange = function (target) {
  if (!this._test(target)) {
    return true
  } else if (this._lowerBound === kNone) {
    return false
  } else if (!this._reverse) {
    if (ltgt.lowerBoundInclusive(this._options)) {
      return ltgt.compare(target, this._lowerBound) < 0
    } else {
      return ltgt.compare(target, this._lowerBound) <= 0
    }
  } else {
    if (ltgt.upperBoundInclusive(this._options)) {
      return ltgt.compare(target, this._lowerBound) > 0
    } else {
      return ltgt.compare(target, this._lowerBound) >= 0
    }
  }
}

MemIterator.prototype._seek = function (target) {
  if (target.length === 0) {
    throw new Error('cannot seek() to an empty target')
  }

  if (this._outOfRange(target)) {
    this._tree = this.db._store.end
    this._tree.next()
  } else if (this._reverse) {
    this._tree = this.db._store.le(target)
  } else {
    this._tree = this.db._store.ge(target)
  }
}

function MemDOWN () {
  if (!(this instanceof MemDOWN)) return new MemDOWN()

  AbstractLevelDOWN.call(this, {
    bufferKeys: true,
    snapshots: true,
    permanence: false,
    seek: true,
    clear: true,
    getMany: true
  })

  this._store = createRBT(ltgt.compare)
}

inherits(MemDOWN, AbstractLevelDOWN)

MemDOWN.prototype._open = function (options, callback) {
  this._nextTick(callback)
}

MemDOWN.prototype._serializeKey = function (key) {
  return Buffer.isBuffer(key) ? key : Buffer.from(String(key))
}

MemDOWN.prototype._serializeValue = function (value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(String(value))
}

MemDOWN.prototype._put = function (key, value, options, callback) {
  const iter = this._store.find(key)

  if (iter.valid) {
    this._store = iter.update(value)
  } else {
    this._store = this._store.insert(key, value)
  }

  this._nextTick(callback)
}

MemDOWN.prototype._get = function (key, options, callback) {
  let value = this._store.get(key)

  if (typeof value === 'undefined') {
    // 'NotFound' error, consistent with LevelDOWN API
    return this._nextTick(function callNext () {
      callback(new Error('NotFound'))
    })
  }

  if (!options.asBuffer) {
    value = value.toString()
  }

  this._nextTick(callback, null, value)
}

MemDOWN.prototype._getMany = function (keys, options, callback) {
  this._nextTick(callback, null, keys.map((key) => {
    const value = this._store.get(key)
    return value === undefined || options.asBuffer ? value : value.toString()
  }))
}

MemDOWN.prototype._del = function (key, options, callback) {
  this._store = this._store.remove(key)
  this._nextTick(callback)
}

MemDOWN.prototype._batch = function (array, options, callback) {
  let i = -1
  let key
  let value
  let iter
  const len = array.length
  let tree = this._store

  while (++i < len) {
    key = array[i].key
    iter = tree.find(key)

    if (array[i].type === 'put') {
      value = array[i].value
      tree = iter.valid ? iter.update(value) : tree.insert(key, value)
    } else {
      tree = iter.remove()
    }
  }

  this._store = tree
  this._nextTick(callback)
}

MemDOWN.prototype._clear = function (options, callback) {
  if (!hasLimit(options) && !Object.keys(options).some(isRangeOption)) {
    // Delete everything by creating a new empty tree.
    this._store = createRBT(ltgt.compare)
    return this._nextTick(callback)
  }

  const iterator = this._iterator({
    ...options,
    keys: true,
    values: false,
    keyAsBuffer: true
  })

  const loop = () => {
    // TODO: add option to control "batch size"
    for (let i = 0; i < 500; i++) {
      if (!iterator[kIncrement]()) return callback()
      if (!iterator._tree.valid) return callback()
      if (!iterator._test(iterator._tree.key)) return callback()

      // Must also include changes made in parallel to clear()
      this._store = this._store.remove(iterator._tree.key)
      iterator._tree[iterator._incr]()
    }

    // Some time to breathe
    this._nextTick(loop)
  }

  this._nextTick(loop)
}

MemDOWN.prototype._iterator = function (options) {
  return new MemIterator(this, options)
}

module.exports = MemDOWN

// Exposed for unit tests only
module.exports.MemIterator = MemIterator

// Use setImmediate() in Node.js to allow IO in between our callbacks
if (typeof process !== 'undefined' && !process.browser && typeof global !== 'undefined' && typeof global.setImmediate === 'function') {
  const setImmediate = global.setImmediate

  MemDOWN.prototype._nextTick = MemIterator.prototype._nextTick = function (fn, ...args) {
    if (args.length === 0) {
      setImmediate(fn)
    } else {
      setImmediate(() => fn(...args))
    }
  }
}

function isRangeOption (k) {
  return rangeOptions.includes(k)
}

function hasLimit (options) {
  return options.limit != null &&
    options.limit >= 0 &&
    options.limit < Infinity
}
