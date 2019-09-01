### Barretenberg, an optimized scalar multiplication library for the bn128 curve  

**this code is highly experimental, use at your own risk!**  

### Getting started  

```
git clone --recursive https://github.com/AztecProtocol/barretenberg  

mkdir build && cd build  
cmake ..
make
```

in order to run tests and benchmarks, requires [libff](https://github.com/scipr-lab/libff) installed, as well as GMP. To compile without tests and benchmarks, use `cmake .. -DBARRETENBERG_TESTING=OFF`  

To select a test, run `./test/barretenberg_tests --gtest_filter=<test_filter>*`