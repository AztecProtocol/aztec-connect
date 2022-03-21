# Upgrade Guide

This document describes breaking changes and how to upgrade. For a complete list of changes including minor and patch releases, please refer to the [`CHANGELOG`][changelog].

## 6.0.0

Legacy range options have been removed ([Level/community#86](https://github.com/Level/community/issues/86)). If you previously did:

```js
db.iterator({ start: 'a', end: 'z' })
```

An error would now be thrown and you must instead do:

```js
db.iterator({ gte: 'a', lte: 'z' })
```

This release also drops support of legacy runtime environments ([Level/community#98](https://github.com/Level/community/issues/98)):

- Node.js 6 and 8
- Internet Explorer 11
- Safari 9-11
- Stock Android browser (AOSP).

Lastly, and less likely to be a breaking change, the [`immediate`](https://github.com/calvinmetcalf/immediate) browser shim for `process.nextTick()` has been replaced with the smaller [`queue-microtask`](https://github.com/feross/queue-microtask).

## 5.0.0

Support of keys & values other than strings and Buffers has been dropped. Internally `memdown` now stores keys & values as Buffers which solves a number of compatibility issues ([#186](https://github.com/Level/memdown/issues/186)). If you pass in a key or value that isn't a string or Buffer, it will be irreversibly stringified.

## 4.0.0

This is an upgrade to `abstract-leveldown@6` which solves long-standing issues around serialization and type support.

### Range options are now serialized

Previously, range options like `lt` were passed through as-is by `abstract-leveldown`, unlike keys. This makes no difference for `memdown` as it does not serialize anything.

### The rules for range options have been relaxed

Because `null`, `undefined`, zero-length strings and zero-length buffers are significant types in encodings like `bytewise` and `charwise`, they became valid as range options in `abstract-leveldown`. This means `db.iterator({ gt: undefined })` is not the same as `db.iterator({})`.

For `memdown`, when used by itself, the behavior of `null`, `undefined`, zero-length strings and zero-length buffers is undefined.

### Nullish values are rejected

In addition to rejecting `null` and `undefined` as _keys_, `abstract-leveldown` now also rejects these types as _values_, due to preexisting significance in streams and iterators.

### Zero-length array keys are rejected

Though this was already the case, `abstract-leveldown` has replaced the behavior with an explicit `Array.isArray()` check and a new error message.

### Browser support

IE10 has been dropped.

## 3.0.0

Dropped support for node 4. No other breaking changes.

## 2.0.0

This release drops Node.js 0.12, brings `memdown` up to par with latest [`levelup`][levelup] (v2) and [`abstract-leveldown`][abstract-leveldown] (v4), simplifies serialization and removes global state.

### Targets latest [`levelup`][levelup]

Usage has changed to:

```js
const levelup = require('levelup')
const memdown = require('memdown')

const db = levelup(memdown())
```

From the old:

```js
const db = levelup('mydb', { db: memdown })
```

### No stringification of keys and values

This means that in addition to Buffers, you can store any JS type without the need for [`encoding-down`][encoding-down]. This release also makes behavior consistent in Node.js and browsers. Please refer to the [README](./README.md) for a detailed explanation.

### No global state or `location` argument

If you previously did this to make a global store:

```js
const db = levelup('mydb', { db: memdown })
```

You must now attach the store to a global yourself (if you desire global state):

```js
const db = window.mydb = levelup(memdown())
```

### No `null` batch operations

Instead of skipping `null` operations, `db.batch([null])` will throw an error courtesy of [`abstract-leveldown`][abstract-leveldown].

[changelog]: CHANGELOG.md

[abstract-leveldown]: https://github.com/Level/abstract-leveldown

[levelup]: https://github.com/Level/levelup

[encoding-down]: https://github.com/Level/encoding-down
