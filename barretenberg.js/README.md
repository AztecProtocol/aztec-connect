# barretenberg.js

Bindings around barretenberg WebAssembly and core components and interfaces for wider system.

## Testing

Due to complex interactions between `jest`, `typescript` and `parcel`, the tests are run from a built version of
the TypeScript code in the `dest` folder. This means you should:

- Run `yarn build:dev` in one terminal, to watch changing code and recompile as necessary.
- Run `yarn test` or `yarn test --watch` to run / develop the tests.

## Building

For development run `yarn build:dev` to watch the source code and build both cjs and es6 versions of the library.
The cjs version will also include the tests, for running via `jest`.

When building for production, run `yarn build`. It will build both cjs and es6 versions of the library, but the tests
will not be included.
