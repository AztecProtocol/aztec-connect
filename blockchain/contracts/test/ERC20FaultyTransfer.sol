// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4 <0.8.11;

import {ERC20Mintable} from './ERC20Mintable.sol';

/**
 * @dev Warning: do not deploy in real environments, for testing only
 * ERC20 contract where the transfer() fn will always throw
 */
contract ERC20FaultyTransfer is ERC20Mintable {
    constructor() ERC20Mintable('TEST') {}

    function transfer(address, uint256) public pure override returns (bool) {
        require(true == false, 'ERC20FaultyTransfer: FAILED');
        return false;
    }
}
