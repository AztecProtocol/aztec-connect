# level-errors

> Error types for [levelup][levelup].

[![level badge][level-badge]](https://github.com/Level/awesome)
[![npm](https://img.shields.io/npm/v/level-errors.svg)](https://www.npmjs.com/package/level-errors)
[![Node version](https://img.shields.io/node/v/level-errors.svg)](https://www.npmjs.com/package/level-errors)
[![Test](https://img.shields.io/github/workflow/status/Level/errors/Test?label=test)](https://github.com/Level/errors/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/codecov/c/github/Level/errors?label=&logo=codecov&logoColor=fff)](https://codecov.io/gh/Level/errors)
[![Standard](https://img.shields.io/badge/standard-informational?logo=javascript&logoColor=fff)](https://standardjs.com)
[![Common Changelog](https://common-changelog.org/badge.svg)](https://common-changelog.org)
[![Donate](https://img.shields.io/badge/donate-orange?logo=open-collective&logoColor=fff)](https://opencollective.com/level)

## API

**If you are upgrading:** please see [`UPGRADING.md`](UPGRADING.md).

### `.LevelUPError()`

Generic error base class.

### `.InitializationError()`

Error initializing the database, like when the database's location argument is missing.

### `.OpenError()`

Error opening the database.

### `.ReadError()`

Error reading from the database.

### `.WriteError()`

Error writing to the database.

### `.NotFoundError()`

Data not found error.

Has extra properties:

- `notFound`: `true`
- `status`: 404

### `.EncodingError()`

Error encoding data.

## Contributing

[`Level/errors`](https://github.com/Level/errors) is an **OPEN Open Source Project**. This means that:

> Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

See the [Contribution Guide](https://github.com/Level/community/blob/master/CONTRIBUTING.md) for more details.

## Donate

Support us with a monthly donation on [Open Collective](https://opencollective.com/level) and help us continue our work.

## License

[MIT](LICENSE)

[level-badge]: https://leveljs.org/img/badge.svg

[levelup]: https://github.com/Level/levelup
