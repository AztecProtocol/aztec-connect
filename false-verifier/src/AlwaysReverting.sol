// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
// pragma solidity >=0.6.10 <0.8.0;
pragma solidity ^0.8.13;

contract AlwaysReverting {
    fallback() external  {
        revert("");
    }
}