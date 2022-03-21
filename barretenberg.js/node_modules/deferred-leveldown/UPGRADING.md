# Upgrade Guide

This document describes breaking changes and how to upgrade. For a complete list of changes including minor and patch releases, please refer to the [changelog](CHANGELOG.md).

## 7.0.0

Previously `deferred-leveldown` would accept operations regardless of the `status` of the inner db. It now only accepts operations while `db.status` is 'opening'.

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

## 5.0.0

Upgraded `abstract-leveldown` to `v6.0.0`. Please see the corresponding [changelog entry](https://github.com/Level/abstract-leveldown/blob/master/CHANGELOG.md#600---2018-10-20) for more information.

## 4.0.0

Dropped support for node 4. No other breaking changes.

## 3.0.0

#### `.batch(array)` enforces objects

This major release contains an upgrade to `abstract-leveldown` with a [breaking change](https://github.com/Level/abstract-leveldown/commit/a2621ad70571f6ade9d2be42632ece042e068805) for the array version of `.batch()`. This change ensures all elements in the batch array are objects.

If you previously passed arrays to `.batch()` that contained `undefined` or `null`, they would be silently ignored. Now this will produce an error.
