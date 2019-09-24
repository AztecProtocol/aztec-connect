### Barretenberg, an optimized elliptic curve library for the bn128 curve, and PLONK SNARK prover

**this code is highly experimental, use at your own risk!**  

### Getting started  

```
git clone --recursive https://github.com/AztecProtocol/barretenberg  

mkdir build && cd build  
cmake ..
make
```

To compile without tests and benchmarks, use `cmake .. -DBARRETENBERG_TESTING=OFF`  

To select a test, run `./test/barretenberg_tests --gtest_filter=<test_filter>*`