const path = require('path');
const { readFileSync, writeFileSync } = require('fs');

// https://github.com/Uniswap/uniswap-v2-periphery/pull/53
const safeMathFilename = path.resolve(__dirname, './node_modules/@uniswap/v2-periphery/contracts/libraries/SafeMath.sol');

try {
  const content = readFileSync(safeMathFilename, 'utf-8');
  writeFileSync(
    safeMathFilename,
    content.replace('pragma solidity =0.6.6;', 'pragma solidity >=0.6.6;'),
    'utf-8',
  );
} catch (e) {
}
