// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {ERC20Mintable} from "./ERC20Mintable.sol";

/**
 * @dev Warning: do not deploy in real environments, for testing only
 * ERC20 contract where the transfer() fn will always throw
 */
contract ERC20RevertingTransfer is ERC20Mintable {
    constructor(string memory _symbol) ERC20Mintable(_symbol) {}

    function transfer(address, uint256) public pure override returns (bool) {
        require(true == false, "ERC20FaultyTransfer: FAILED");
        return false;
    }
}
