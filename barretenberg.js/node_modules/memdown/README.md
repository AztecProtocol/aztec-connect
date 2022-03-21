# memdown

> In-memory [`abstract-leveldown`] store for Node.js and browsers.

[![level badge][level-badge]](https://github.com/Level/awesome)
[![npm](https://img.shields.io/npm/v/memdown.svg)](https://www.npmjs.com/package/memdown)
[![Node version](https://img.shields.io/node/v/memdown.svg)](https://www.npmjs.com/package/memdown)
[![Test](https://img.shields.io/github/workflow/status/Level/memdown/Test?label=test)](https://github.com/Level/memdown/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/codecov/c/github/Level/memdown?label=&logo=codecov&logoColor=fff)](https://codecov.io/gh/Level/memdown)
[![Standard](https://img.shields.io/badge/standard-informational?logo=javascript&logoColor=fff)](https://standardjs.com)
[![Common Changelog](https://common-changelog.org/badge.svg)](https://common-changelog.org)
[![Donate](https://img.shields.io/badge/donate-orange?logo=open-collective&logoColor=fff)](https://opencollective.com/level)

## Example

_If you are upgrading: please see [`UPGRADING.md`](./UPGRADING.md)._

```js
const levelup = require('levelup')
const memdown = require('memdown')

const db = levelup(memdown())

db.put('hey', 'you', (err) => {
  if (err) throw err

  db.get('hey', { asBuffer: false }, (err, value) => {
    if (err) throw err
    console.log(value) // 'you'
  })
})
```

With `async/await`:

```js
await db.put('hey', 'you')
const value = await db.get('hey', { asBuffer: false })
```

Your data is discarded when the process ends or you release a reference to the store. Note as well, though the internals of `memdown` operate synchronously - [`levelup`] does not.

## Browser support

[![Sauce Test Status](https://app.saucelabs.com/browser-matrix/level-ci.svg)](https://app.saucelabs.com/u/level-ci)

## Data types

Keys and values can be strings or Buffers. Any other key type will be irreversibly stringified. The only exceptions are `null` and `undefined`. Keys and values of that type are rejected.

```js
const db = levelup(memdown())

db.put('example', 123, (err) => {
  if (err) throw err

  db.createReadStream({
    keyAsBuffer: false,
    valueAsBuffer: false
  }).on('data', (entry) => {
    console.log(typeof entry.key) // 'string'
    console.log(typeof entry.value) // 'string'
  })
})
```

If you desire non-destructive encoding (e.g. to store and retrieve numbers as-is), wrap `memdown` with [`encoding-down`]. Alternatively install [`level-mem`] which conveniently bundles [`levelup`], `memdown` and [`encoding-down`]. Such an approach is also recommended if you want to achieve universal (isomorphic) behavior. For example, you could have [`leveldown`] in a backend and `memdown` in the frontend.

```js
const encode = require('encoding-down')
const db = levelup(encode(memdown(), { valueEncoding: 'json' }))

db.put('example', 123, (err) => {
  if (err) throw err

  db.createReadStream({
    keyAsBuffer: false,
    valueAsBuffer: false
  }).on('data', (entry) => {
    console.log(typeof entry.key) // 'string'
    console.log(typeof entry.value) // 'number'
  })
})
```

## Snapshot guarantees

A `memdown` store is backed by [a fully persistent data structure](https://www.npmjs.com/package/functional-red-black-tree) and thus has snapshot guarantees. Meaning that reads operate on a snapshot in time, unaffected by simultaneous writes.

## Test

In addition to the regular `npm test`, you can test `memdown` in a browser of choice with:

```
npm run test-browser-local
```

To check code coverage:

```
npm run coverage
```

## Contributing

[`Level/memdown`](https://github.com/Level/memdown) is an **OPEN Open Source Project**. This means that:

> Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

See the [Contribution Guide](https://github.com/Level/community/blob/master/CONTRIBUTING.md) for more details.

## Big Thanks

Cross-browser Testing Platform and Open Source ♥ Provided by [Sauce Labs](https://saucelabs.com).

[![Sauce Labs logo](./sauce-labs.svg)](https://saucelabs.com)

## Donate

Support us with a monthly donation on [Open Collective](https://opencollective.com/level) and help us continue our work.

## License

[MIT](LICENSE)

[`abstract-leveldown`]: https://github.com/Level/abstract-leveldown

[`levelup`]: https://github.com/Level/levelup

[`encoding-down`]: https://github.com/Level/encoding-down

[`leveldown`]: https://github.com/Level/leveldown

[`level-mem`]: https://github.com/Level/mem

[level-badge]: https://leveljs.org/img/badge.svg
