// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

contract ProxyKiller {
    function initialize() public {
        selfdestruct(payable(msg.sender));
    }
}
