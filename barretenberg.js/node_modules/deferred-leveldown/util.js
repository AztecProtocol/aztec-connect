'use strict'

exports.getCallback = function (args, symbol, map) {
  let callback = args[args.length - 1]

  if (typeof callback !== 'function') {
    const promise = new Promise((resolve, reject) => {
      args.push(callback = function (err, ...results) {
        if (err) reject(err)
        else resolve(map ? map(...results) : results[0])
      })
    })

    callback[symbol] = promise
  }

  return callback
}
