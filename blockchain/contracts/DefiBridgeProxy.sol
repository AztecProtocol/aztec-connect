// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import 'hardhat/console.sol';

contract DefiBridgeProxy {
    using SafeMath for uint256;

    bytes4 private constant BALANCE_OF_SELECTOR = 0x70a08231; // bytes4(keccak256('balanceOf(address)'));
    bytes4 private constant DEPOSIT_SELECTOR = 0xb6b55f25; // bytes4(keccak256('deposit(uint256)'));
    bytes4 private constant TRANSFER_SELECTOR = 0xa9059cbb; // bytes4(keccak256('transfer(address,uint256)'));
    bytes4 private constant WITHDRAW_SELECTOR = 0x2e1a7d4d; // bytes4(keccak256('withdraw(uint256)'));
    bytes4 private constant CONVERT_SELECTOR = 0x7ea1ab1a; // bytes4(keccak256('convert(address,address,address,uint256,uint256,uint32,uint32,uint64)'));

    function getBalance(address assetAddress) internal view returns (uint256 result) {
        assembly {
            // Is this Eth?
            if iszero(assetAddress) {
                result := balance(address())
            }
            // Is this a token? i.e. assetAddress nonzero
            if assetAddress {
                let ptr := mload(0x40)
                mstore(ptr, BALANCE_OF_SELECTOR)
                mstore(add(ptr, 0x4), address())
                if iszero(staticcall(gas(), assetAddress, ptr, 0x24, ptr, 0x20)) {
                    // ruh roh call failed
                    revert(0x00, 0x00)
                }
                result := mload(ptr)
            }
        }
    }

    function convert(
        address bridgeAddress,
        address inputAssetAddress,
        address outputAssetAddressA,
        address outputAssetAddressB,
        uint32 openingNonce,
        uint256 totalInputValue,
        uint256 interactionNonce,
        uint256 auxInputData // (auxData || bitConfig)
    )
        external
        returns (
            uint256 outputValueA,
            uint256 outputValueB,
            bool isAsync
        )
    {
        assembly {
            // Transfer totalInputValue to the bridge contract if erc20. ETH is sent on call to convert.
            if not(eq(inputAssetAddress, 0)) {
                let ptr := mload(0x40)
                mstore(ptr, TRANSFER_SELECTOR)
                mstore(add(ptr, 0x4), bridgeAddress)
                mstore(add(ptr, 0x24), totalInputValue)
                if iszero(call(gas(), inputAssetAddress, 0, ptr, 0x44, ptr, 0)) {
                    // transfer failed, let's get out of here
                    revert(0x00, 0x00)
                }
            }
        }

        outputValueA = getBalance(outputAssetAddressA);
        outputValueB = (auxInputData & 1) == 1 ? getBalance(outputAssetAddressB) : 0;

        // Call bridge.convert(), which will return output values for the two output assets.
        // If input is ETH, send it along with call to convert.
        assembly {
            mstore(mload(0x40), CONVERT_SELECTOR)
            mstore(add(mload(0x40), 0x4), inputAssetAddress)
            mstore(add(mload(0x40), 0x24), outputAssetAddressA)
            mstore(add(mload(0x40), 0x44), outputAssetAddressB)
            mstore(add(mload(0x40), 0x64), totalInputValue)
            mstore(add(mload(0x40), 0x84), interactionNonce)
            mstore(add(mload(0x40), 0xa4), openingNonce)
            mstore(add(mload(0x40), 0xc4), and(auxInputData, 0xffffffff)) // bitConfig
            mstore(add(mload(0x40), 0xe4), and(shr(32, auxInputData), 0xffffffffffffffff)) // auxData
            if iszero(
                call(
                    gas(),
                    bridgeAddress,
                    mul(totalInputValue, eq(inputAssetAddress, 0)),
                    mload(0x40),
                    0x114,
                    mload(0x40),
                    0x60
                )
            ) {
                revert(0x00, 0x00) // TODO add err msg
            }
            isAsync := mload(add(mload(0x40), 0x40))
        }

        outputValueA = getBalance(outputAssetAddressA) - outputValueA;
        outputValueB = (auxInputData & 1) == 1 ? getBalance(outputAssetAddressB) - outputValueB : 0;

        if (isAsync) {
            require(outputValueA == 0 && outputValueB == 0, 'DefiBridgeProxy: ASYNC_NONZERO_OUTPUT_VALUES');
        } else {
            require(outputValueA > 0 || outputValueB > 0, 'DefiBridgeProxy: ZERO_OUTPUT_VALUES');
        }
    }
}
