// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

// import 'hardhat/console.sol';

contract DefiBridgeProxy {
    using SafeMath for uint256;

    bytes4 private constant BALANCE_OF_SELECTOR = 0x70a08231; // bytes4(keccak256('balanceOf(address)'));
    bytes4 private constant DEPOSIT_SELECTOR = 0xb6b55f25; // bytes4(keccak256('deposit(uint256)'));
    bytes4 private constant TRANSFER_SELECTOR = 0xa9059cbb; // bytes4(keccak256('transfer(address,uint256)'));
    bytes4 private constant WITHDRAW_SELECTOR = 0x2e1a7d4d; // bytes4(keccak256('withdraw(uint256)'));
    bytes4 private constant CONVERT_SELECTOR = 0xa3908e1b; // bytes4(keccak256('convert(uint256)'));

    function getBalance(address assetAddress) internal view returns (uint256 result) {
        assembly {
            let isEth := eq(assetAddress, 0)
            if eq(isEth, 1) {
                result := balance(address())
            }
            if eq(isEth, 0) {
                let ptr := mload(0x40)
                mstore(ptr, BALANCE_OF_SELECTOR)
                mstore(add(ptr, 0x4), address())
                pop(staticcall(gas(), assetAddress, ptr, 0x24, ptr, 0x20))
                result := mload(ptr)
            }
        }
    }

    function convert(
        address bridgeAddress,
        address inputAssetAddress,
        address outputAssetAddressA,
        address outputAssetAddressB,
        uint256 totalInputValue
    ) external returns (uint256 outputValueA, uint256 outputValueB) {
        bool success;

        assembly {
            // Transfer totalInputValue to the bridge contract if erc20. ETH is sent on call to convert.
            if not(eq(inputAssetAddress, 0)) {
                let ptr := mload(0x40)
                mstore(ptr, TRANSFER_SELECTOR)
                mstore(add(ptr, 0x4), bridgeAddress)
                mstore(add(ptr, 0x24), totalInputValue)
                pop(call(gas(), inputAssetAddress, 0, ptr, 0x44, ptr, 0))
            }
        }

        uint256 initialBalanceA = getBalance(outputAssetAddressA);
        uint256 initialBalanceB = getBalance(outputAssetAddressB);

        // Call bridge.convert(), which will return output values for the two output assets.
        // If input is ETH, send it along with call to convert.
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, CONVERT_SELECTOR)
            mstore(add(ptr, 0x4), totalInputValue)
            success := call(gas(), bridgeAddress, mul(totalInputValue, eq(inputAssetAddress, 0)), ptr, 0x24, ptr, 0x40)
        }
        require(success, 'DefiBridgeProxy: CONVERT_FAILED');

        outputValueA = getBalance(outputAssetAddressA) - initialBalanceA;
        outputValueB = getBalance(outputAssetAddressB) - initialBalanceB;
    }
}
