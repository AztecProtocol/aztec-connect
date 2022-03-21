'use strict'

const inherits = require('inherits')
const { Readable } = require('readable-stream')

module.exports = ReadStream
inherits(ReadStream, Readable)

function ReadStream (iterator, options) {
  if (!(this instanceof ReadStream)) return new ReadStream(iterator, options)
  options = options || {}
  Readable.call(this, Object.assign({}, options, {
    objectMode: true
  }))
  this._iterator = iterator
  this._options = options
  this.on('end', this.destroy.bind(this, null, null))
}

ReadStream.prototype._read = function () {
  if (this.destroyed) return

  this._iterator.next((err, key, value) => {
    if (this.destroyed) return
    if (err) return this.destroy(err)

    if (key === undefined && value === undefined) {
      this.push(null)
    } else if (this._options.keys !== false && this._options.values === false) {
      this.push(key)
    } else if (this._options.keys === false && this._options.values !== false) {
      this.push(value)
    } else {
      this.push({ key, value })
    }
  })
}

ReadStream.prototype._destroy = function (err, callback) {
  this._iterator.end(function (err2) {
    callback(err || err2)
  })
}
