// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {ERC20Mintable} from './ERC20Mintable.sol';

import {IRollupProcessor} from '../interfaces/IRollupProcessor.sol';

/**
 * @dev Warning: do not deploy in real environments, for testing only
 * ERC20 contract where the transfer() fn will always throw
 */
contract ERC20Reenter is ERC20Mintable {
    error LOCKED_NO_REENTER();

    constructor() ERC20Mintable('TEST') {}

    function transferFrom(
        address,
        address to,
        uint256
    ) public override returns (bool) {
        IRollupProcessor(to).processRollup('', '');
        return true;
    }
}
