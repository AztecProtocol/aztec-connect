## Aztec Connect Cpp: C++ codebase that uses Barretenberg for Aztec Connect rollup circuits

**This code is highly experimental, use at your own risk!**

### Dependencies

- cmake >= 3.16
- clang >= 10 or gcc >= 10
- clang-format
- libomp (if multithreading is required. Multithreading can be disabled using the compiler flag `-DMULTITHREADING 0`)

### Installing openMP (Linux)

```
RUN git clone -b release/10.x --depth 1 https://github.com/llvm/llvm-project.git \
  && cd llvm-project && mkdir build-openmp && cd build-openmp \
  && cmake ../openmp -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ -DLIBOMP_ENABLE_SHARED=OFF \
  && cmake --build . --parallel \
  && cmake --build . --parallel --target install \
  && cd ../.. && rm -rf llvm-project
```

### Getting started

Run the bootstrap script. (The bootstrap script will build both the native and wasm versions of aztec-connect-cpp)

```
./bootstrap.sh rollup_cli db_cli tx_factory keygen
```

### Formatting

Code is formatted using `clang-format` and the `./format.sh` script which is called via a git pre-commit hook.
If you've installed the C++ Vscode extension you should configure it to format on save.

### Testing

Each module has its own tests. e.g. To build and run `rollup_proofs_account` tests:

```
cmake --build . --parallel --target rollup_proofs_account_tests
./bin/rollup_proofs_account_tests
```

A shorthand for the above is:

```
cmake --build . --parallel --target run_rollup_proofs_account_tests
```

Running the entire suite of tests using `ctest`:

```
cmake --build . --parallel --target test
```

You can run specific tests, e.g.

```
./bin/rollup_proofs_account_tests --gtest_filter=client_proofs_account_tx.*
```

### CMake Build Options

CMake can be passed various build options on it's command line:

- `-DCMAKE_BUILD_TYPE=Debug | Release | RelWithAssert`: Build types.
- `-DDISABLE_ASM=ON | OFF`: Enable/disable x86 assembly.
- `-DDISABLE_ADX=ON | OFF`: Enable/disable ADX assembly instructions (for older cpu support).
- `-DMULTITHREADING=ON | OFF`: Enable/disable multithreading using OpenMP.
- `-DTESTING=ON | OFF`: Enable/disable building of tests.
- `-DTOOLCHAIN=<filename in ./cmake/toolchains>`: Use one of the preconfigured toolchains.

### WASM build

To build:

```
mkdir build-wasm && cd build-wasm
cmake -DTOOLCHAIN=wasm-linux-clang ..
cmake --build . --parallel --target aztec-connect.wasm
```

The resulting wasm binary will be at `./src/aztec/aztec-connect.wasm`.

To run the tests, you'll need to install `wasmtime`.

```
curl https://wasmtime.dev/install.sh -sSf | bash
```

Tests can be built and run like:

```
cmake --build . --parallel --target rollup_proofs_account_tests
wasmtime --dir=.. ./bin/rollup_proofs_account_tests
```

To turn on address sanitizer add `-DADDRESS_SANITIZER=ON`. Note that address sanitizer can be used to explore crashes.
Sometimes you might have to specify the address of llvm-symbolizer. You have to do it with `export ASAN_SYMBOLIZER_PATH=<PATH_TO_SYMBOLIZER>`.
For undefined behaviour sanitizer `-DUNDEFINED_BEHAVIOUR_SANITIZER=ON`.
Note that the fuzzer can be orders of magnitude slower with ASan (2-3x slower) or UBSan on, so it is best to run a non-sanitized build first, minimize the testcase and then run it for a bit of time with sanitizers.
