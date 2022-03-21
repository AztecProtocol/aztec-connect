# deferred-leveldown

> A mock `abstract-leveldown` implementation that queues operations while a real `abstract-leveldown` instance is being opened.

[![level badge][level-badge]](https://github.com/Level/awesome)
[![npm](https://img.shields.io/npm/v/deferred-leveldown.svg)](https://www.npmjs.com/package/deferred-leveldown)
[![Node version](https://img.shields.io/node/v/deferred-leveldown.svg)](https://www.npmjs.com/package/deferred-leveldown)
[![Test](https://img.shields.io/github/workflow/status/Level/deferred-leveldown/Test?label=test)](https://github.com/Level/deferred-leveldown/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/codecov/c/github/Level/deferred-leveldown?label=&logo=codecov&logoColor=fff)](https://codecov.io/gh/Level/deferred-leveldown)
[![Standard](https://img.shields.io/badge/standard-informational?logo=javascript&logoColor=fff)](https://standardjs.com)
[![Common Changelog](https://common-changelog.org/badge.svg)](https://common-changelog.org)
[![Donate](https://img.shields.io/badge/donate-orange?logo=open-collective&logoColor=fff)](https://opencollective.com/level)

## Usage

_If you are upgrading: please see [UPGRADING.md](UPGRADING.md)._

`deferred-leveldown` implements the [`abstract-leveldown`](https://github.com/Level/abstract-leveldown) API so it can be used as a drop-in replacement where `leveldown` is needed.

`put()`, `get()`, `getMany()`, `del()`, `batch()` and `clear()` operations are all queued and kept in memory until the `abstract-leveldown`-compatible object has been opened through `deferred-leveldown`'s `open()` method.

`batch()` operations will all be replayed as the array form. Chained-batch operations are converted before being stored.

```js
const deferred  = require('deferred-leveldown')
const leveldown = require('leveldown')

const db = deferred(leveldown('location'))

// Must always call open() first
db.open(function (err) {
  // ...
})

// But can operate before open() has finished
db.put('foo', 'bar', function (err) {
  // ...
})
```

## Contributing

[`Level/deferred-leveldown`](https://github.com/Level/deferred-leveldown) is an **OPEN Open Source Project**. This means that:

> Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

See the [Contribution Guide](https://github.com/Level/community/blob/master/CONTRIBUTING.md) for more details.

## Donate

Support us with a monthly donation on [Open Collective](https://opencollective.com/level) and help us continue our work.

## License

[MIT](LICENSE)

[level-badge]: https://leveljs.org/img/badge.svg
