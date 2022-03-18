# Blockchain

This package is responsible for smart contract and other blockchain related work.

## Getting started

```
./bootstrap.sh
```

## Testing

To test and incorporate changes to circuits:  
`yarn test`

To save time after only changing a contract:  
`yarn compile && NODE_NO_WARNINGS=1 yarn jest`

To save time after only changing a test file:  
`yarn jest --runInBand`  
(`runInBand` gives more debugging info).

To test a specific file:  
`yarn jest contracts/rollup_processor/loan_defi_bridge.test.ts --runInBand`  
(notice the path is relative to `./src` due to the `"jest"` config in the `package.json`).
