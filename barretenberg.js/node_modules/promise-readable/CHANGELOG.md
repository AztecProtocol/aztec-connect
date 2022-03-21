# Changelog

## v5.0.4 2019-12-24

- Chunk might be an empty string: fixes #32.

## v5.0.3 2019-10-07

- Use `mocha-steps` for testing.

## v5.0.2 2019-10-07

- Updated dependencies.

## v5.0.1 2019-07-15

- Minor tweaks in README.

## v5.0.0 2019-07-14

- `PromiseReadable` implements `AsyncIterable` so it is possible to use
  `for await (const chunk of promiseReadable)` loop.
- New method `iterate` is provided.

## v4.2.1 2019-06-04

- Minor tweaks in README.
- Added source map to the package.

## v4.2.0 2019-05-09

- Another changes for visibility of properties that are required by
  `PromiseDuplex`.

## v4.1.0 2019-05-09

- Some changes for visibility of properties.

## v4.0.0 2019-05-09

- Rewritten in Typescript.
- `PromiseReadable` constructor accepts `NodeJS.ReadableStream`.
- Dropped support for Node < 6.

## v3.1.5 2018-03-12

- Reformatting.

## v3.1.4 2018-03-12

- Use markdownlint.

## v3.1.3 2018-02-05

- Minor bugfix for `destroy`.

## v3.1.2 2018-02-05

- Can call `destroy` twice.

## v3.1.1 2018-02-04

- Minor bugfix in README.

## v3.1.0 2018-02-04

- New method `setEncoding`.
- `read` and `readAll` methods can return `string` if encoding is set.
- Support `import PromiseReadable from 'promise-readable'` syntax.

## v3.0.1 2018-02-04

- Minor refactoring.

## v3.0.0 2018-02-03

- No support for streams v1.
- New method `destroy`.
- Bugfix when `PromiseReadable` could ignore `error` event.

## v2.1.1 2018-01-18

- `readAll` resumes the stream.

## v2.1.0 2017-10-10

- Typescript: `PromiseReadable<TReadable extends Readable>`.

## v2.0.0 2017-10-06

- Use native `Promise` rather than `any-event`.

## v1.2.1 2017-10-06

- Typescript: reference additional modules in our typings file.

## v1.2.0 2017-10-03

- `once` is resolved to `undefined` when stream is already closed or
  destroyed for `"close"` or `"end"` events and rejects for others.
- `read` and `readAll` is resolved when `"close"` event was occured.

## v1.1.0 2017-10-01

- Typescript: stream is `TReadable extends NodeJS.ReadableStream`

## v1.0.0 2017-09-28

- Exports also as a class and namespace and the default.
- Typings for Typescript.
- Additional safe checks for detecting already closed stream.

_Breaking change:_

- Resolves to `undefined` rather than `null` if there is no data or stream is
  closed. Please use double sign equality instead triple sign to check if
  stream is closed, ie. `data == null`.

## v0.4.3 2017-06-22

- Upgraded chai@4.0.2, chai-as-promised@7.0.0, snazzy@7.0.0
  standard@10.0.2, tap@10.5.1, tap-given@0.4.1

## v0.4.2 2017-03-16

- Minor tweaks for documentation.

## v0.4.1 2017-03-14

- `once('error')` is the same as `once('end')`.

## v0.4.0 2017-03-14

- New method `once` replaces other `once*` methods.

## v0.3.0 2017-03-11

- Method `end` is renamed to `onceEnd`.

## v0.2.0 2017-03-11

- Methods `onceOpen` and `onceClose` (with prefix).

## v0.1.0 2017-03-10

- New methods `open` and `close` for `fs.ReadStream` streams.

## v0.0.2 2017-03-09

- Listen on `end` event rather than `close`.
- Use `stream.read()` if stream2 is available.
- Use `pause`/`resume` to be sure that `end` event won't be missed if stream1
  is available.
- Do not block on reading of already ended stream.

## v0.0.1 2017-03-08

- Initial release
