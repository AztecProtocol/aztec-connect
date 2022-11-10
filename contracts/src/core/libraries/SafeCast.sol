// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

library SafeCast {
    error SAFE_CAST_OVERFLOW();

    function toU128(uint256 a) internal pure returns (uint128) {
        if (a > type(uint128).max) revert SAFE_CAST_OVERFLOW();
        return uint128(a);
    }
}
