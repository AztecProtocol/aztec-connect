// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {ERC20Mintable} from './ERC20Mintable.sol';

/**
 * @dev Warning: do not deploy in real environments, for testing only
 * ERC20 contract where the transfer() fn will always throw
 */
contract ERC20FaultyTransfer is ERC20Mintable {
    constructor() public ERC20Mintable() {}

    function transfer(address, uint256) public override returns (bool) {
        require(true == false, 'ERC20FaultyTransfer: FAILED');
        return false;
    }
}
