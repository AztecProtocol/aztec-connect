# Purpose
This package is responsible for smart contract and other blockchain interaction related work.

## Getting started
We use `hardhat` <a href="https://hardhat.org/"> as the smart contract development framework. Alongside this, `ethers.js` <a href="https://docs.ethers.io/ethers.js/html/"> is used as the `web3` library and Waffle as the test library <a href="https://ethereum-waffle.readthedocs.io/en/latest/">. 

The syntax is in many cases similar to Truffle/web3.js, but checkout <a href="https://hardhat.org/guides/waffle-testing.html"> to get an initial look.
 
To setup the package for local development, run the `bootstrap.sh` script from the root of the package.

## Warning
Do not put secret information in the `.env.example` file. It is an example showing what 
