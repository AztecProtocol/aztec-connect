// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

contract DefiBridgeProxy {
    using SafeMath for uint256;

    bytes4 private constant BALANCE_OF_SELECTOR = 0x70a08231; // bytes4(keccak256('balanceOf(address)'));
    bytes4 private constant DEPOSIT_SELECTOR = 0xb6b55f25; // bytes4(keccak256('deposit(uint256)'));
    bytes4 private constant TRANSFER_SELECTOR = 0xa9059cbb; // bytes4(keccak256('transfer(address,uint256)'));
    bytes4 private constant WITHDRAW_SELECTOR = 0x2e1a7d4d; // bytes4(keccak256('withdraw(uint256)'));
    bytes4 private constant CONVERT_SELECTOR = 0xa3908e1b; // bytes4(keccak256('convert(uint256)'));

    address public immutable weth;

    constructor(address _weth) public {
        weth = _weth;
    }

    function convert(
        address bridgeAddress,
        address inputAssetAddress,
        address outputAssetAddressA,
        address outputAssetAddressB,
        uint256 totalInputValue
    ) external returns (uint256 outputValueA, uint256 outputValueB) {
        // If dealing with ETH, we first send the ETH to the WETH contract.
        if (inputAssetAddress == weth) {
            assembly {
                let ptr := mload(0x40)
                mstore(ptr, DEPOSIT_SELECTOR)
                mstore(add(ptr, 0x4), totalInputValue)
                pop(call(gas(), inputAssetAddress, totalInputValue, ptr, 0x24, ptr, 0))
            }
        }

        // Transfer totalInputValue to the bridge contract.
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, TRANSFER_SELECTOR)
            mstore(add(ptr, 0x4), bridgeAddress)
            mstore(add(ptr, 0x24), totalInputValue)
            pop(call(gas(), inputAssetAddress, 0, ptr, 0x44, ptr, 0))
        }

        uint256 initialBalanceA;
        uint256 initialBalanceB;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, BALANCE_OF_SELECTOR)
            mstore(add(ptr, 0x4), address())
            pop(staticcall(gas(), outputAssetAddressA, ptr, 0x24, add(ptr, 0x24), 0x20))
            initialBalanceA := mload(add(ptr, 0x24))
            if gt(outputAssetAddressB, 0) {
                pop(staticcall(gas(), outputAssetAddressB, ptr, 0x24, add(ptr, 0x24), 0x20))
                initialBalanceB := mload(add(ptr, 0x24))
            }
        }

        bool success;
        // Call bridge.convert(), which will return output values for the two output assets.
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, CONVERT_SELECTOR)
            mstore(add(ptr, 0x4), totalInputValue)
            success := call(gas(), bridgeAddress, 0, ptr, 0x24, ptr, 0x40)
            outputValueA := mload(ptr)
            if gt(outputAssetAddressB, 0) {
                outputValueB := mload(add(ptr, 0x20))
            }
        }
        require(success, 'DefiBridgeProxy: CONVERT_FAILED');
        require(outputValueA > 0 || outputValueB > 0, 'DefiBridgeProxy: ZERO_OUTPUT_VALUES');

        // Make sure balances have increased by the correct amounts.
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, BALANCE_OF_SELECTOR)
            mstore(add(ptr, 0x4), address())
            pop(staticcall(gas(), outputAssetAddressA, ptr, 0x24, add(ptr, 0x24), 0x20))
            success := eq(mload(add(ptr, 0x24)), add(initialBalanceA, outputValueA))
            if and(success, gt(outputAssetAddressB, 0)) {
                pop(staticcall(gas(), outputAssetAddressB, ptr, 0x24, add(ptr, 0x24), 0x20))
                success := eq(mload(add(ptr, 0x24)), add(initialBalanceB, outputValueB))
            }
        }
        require(success, 'DefiBridgeProxy: WRONG_OUTPUT_VALUE');

        if (outputAssetAddressA == weth && outputValueA > 0) {
            withdrawEth(outputAssetAddressA, outputValueA);
        }
        if (outputAssetAddressB == weth && outputValueB > 0) {
            withdrawEth(outputAssetAddressB, outputValueB);
        }
    }

    function withdrawEth(address assetAddress, uint256 amount) internal {
        bool success;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, WITHDRAW_SELECTOR)
            mstore(add(ptr, 0x4), amount)
            success := call(gas(), assetAddress, 0, ptr, 0x24, ptr, 0x0)
        }
        require(success, 'DefiBridgeProxy: WITHDRAW_ETH_FAILED');
    }
}
