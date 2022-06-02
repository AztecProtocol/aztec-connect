// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

/**
 * @title TokenTransfers
 * @dev Provides functions to safely call `transfer` and `transferFrom` methods on ERC20 tokens,
 * as well as the ability to call `transfer` and `transferFrom` without bubbling up errors
 */
library TokenTransfers {
    bytes4 private constant TRANSFER_SELECTOR = 0xa9059cbb; // bytes4(keccak256('transfer(address,uint256)'));
    bytes4 private constant TRANSFER_FROM_SELECTOR = 0x23b872dd; // bytes4(keccak256('transferFrom(address,address,uint256)'));

    /**
     * @dev Safely call ERC20.transfer, handles tokens that do not throw on transfer failure or do not return transfer result
     * @param tokenAddress Where does the token live?
     * @param to Who are we sending tokens to?
     * @param amount How many tokens are we transferring?
     */
    function safeTransferTo(
        address tokenAddress,
        address to,
        uint256 amount
    ) internal {
        // The ERC20 token standard states that:
        // 1. failed transfers must throw
        // 2. the result of the transfer (success/fail) is returned as a boolean
        // Some token contracts don't implement the spec correctly and will do one of the following:
        // 1. Contract does not throw if transfer fails, instead returns false
        // 2. Contract throws if transfer fails, but does not return any boolean value
        // We can check for these by evaluating the following:
        // | call succeeds? (c) | return value (v) | returndatasize == 0 (r)| interpreted result |
        // | ---                | ---              | ---                    | ---                |
        // | false              | false            | false                  | transfer fails     |
        // | false              | false            | true                   | transfer fails     |
        // | false              | true             | false                  | transfer fails     |
        // | false              | true             | true                   | transfer fails     |
        // | true               | false            | false                  | transfer fails     |
        // | true               | false            | true                   | transfer succeeds  |
        // | true               | true             | false                  | transfer succeeds  |
        // | true               | true             | true                   | transfer succeeds  |
        //
        // i.e. failure state = !(c && (r || v))
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, TRANSFER_SELECTOR)
            mstore(add(ptr, 0x4), to)
            mstore(add(ptr, 0x24), amount)
            let call_success := call(gas(), tokenAddress, 0, ptr, 0x44, 0x00, 0x20)
            let result_success := or(iszero(returndatasize()), and(mload(0), 1))
            if iszero(and(call_success, result_success)) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

    /**
     * @dev Safely call ERC20.transferFrom, handles tokens that do not throw on transfer failure or do not return transfer result
     * @param tokenAddress Where does the token live?
     * @param source Who are we transferring tokens from
     * @param target Who are we transferring tokens to?
     * @param amount How many tokens are being transferred?
     */
    function safeTransferFrom(
        address tokenAddress,
        address source,
        address target,
        uint256 amount
    ) internal {
        assembly {
            // call tokenAddress.transferFrom(source, target, value)
            let mPtr := mload(0x40)
            mstore(mPtr, TRANSFER_FROM_SELECTOR)
            mstore(add(mPtr, 0x04), source)
            mstore(add(mPtr, 0x24), target)
            mstore(add(mPtr, 0x44), amount)
            let call_success := call(gas(), tokenAddress, 0, mPtr, 0x64, 0x00, 0x20)
            let result_success := or(iszero(returndatasize()), and(mload(0), 1))
            if iszero(and(call_success, result_success)) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

    /**
     * @dev Calls ERC(tokenAddress).transfer(to, amount). Errors are ignored! Use with caution!
     * @param tokenAddress Where does the token live?
     * @param to Who are we sending to?
     * @param amount How many tokens are being transferred?
     * @param gasToSend Amount of gas to send the contract. If value is 0, function uses gas() instead
     */
    function transferToDoNotBubbleErrors(
        address tokenAddress,
        address to,
        uint256 amount,
        uint256 gasToSend
    ) internal {
        assembly {
            let callGas := gas()
            if gasToSend {
                callGas := gasToSend
            }
            let ptr := mload(0x40)
            mstore(ptr, TRANSFER_SELECTOR)
            mstore(add(ptr, 0x4), to)
            mstore(add(ptr, 0x24), amount)
            pop(call(callGas, tokenAddress, 0, ptr, 0x44, 0x00, 0x00))
        }
    }

    /**
     * @dev Calls ERC(tokenAddress).transferFrom(source, target, amount). Errors are ignored! Use with caution!
     * @param tokenAddress Where does the token live?
     * @param source Who are we transferring tokens from
     * @param target Who are we transferring tokens to?
     * @param amount How many tokens are being transferred?
     * @param gasToSend Amount of gas to send the contract. If value is 0, function uses gas() instead
     */
    function transferFromDoNotBubbleErrors(
        address tokenAddress,
        address source,
        address target,
        uint256 amount,
        uint256 gasToSend
    ) internal {
        assembly {
            let callGas := gas()
            if gasToSend {
                callGas := gasToSend
            }
            let mPtr := mload(0x40)
            mstore(mPtr, TRANSFER_FROM_SELECTOR)
            mstore(add(mPtr, 0x04), source)
            mstore(add(mPtr, 0x24), target)
            mstore(add(mPtr, 0x44), amount)
            pop(call(callGas, tokenAddress, 0, mPtr, 0x64, 0x00, 0x00))
        }
    }
}
