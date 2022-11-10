// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {ERC20Mintable} from "./ERC20Mintable.sol";

import {IRollupProcessor} from "rollup-encoder/interfaces/IRollupProcessor.sol";

/**
 * @dev Warning: do not deploy in real environments, for testing only
 * ERC20 contract where the transfer() fn will always throw
 */
contract ERC20Reenter is ERC20Mintable {
    error LOCKED_NO_REENTER();

    constructor(string memory _symbol) ERC20Mintable(_symbol) {}

    function transferFrom(address, address _to, uint256) public override returns (bool) {
        IRollupProcessor(_to).processRollup("", "");
        return true;
    }
}
