// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;
pragma experimental ABIEncoderV2;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {IDefiBridge} from './interfaces/IDefiBridge.sol';
import {AztecTypes} from './AztecTypes.sol';

import 'hardhat/console.sol';

contract DefiBridgeProxy {
    using SafeMath for uint256;

    bytes4 private constant BALANCE_OF_SELECTOR = 0x70a08231; // bytes4(keccak256('balanceOf(address)'));
    bytes4 private constant TRANSFER_SELECTOR = 0xa9059cbb; // bytes4(keccak256('transfer(address,uint256)'));
    bytes4 private constant DEPOSIT_SELECTOR = 0xb6b55f25; // bytes4(keccak256('deposit(uint256)'));
    bytes4 private constant WITHDRAW_SELECTOR = 0x2e1a7d4d; // bytes4(keccak256('withdraw(uint256)'));

    event AztecBridgeInteraction(
        address indexed bridgeAddress,
        uint256 outputValueA,
        uint256 outputValueB,
        bool isAsync
    );

    receive() external payable {}

    function getBalance(address assetAddress) internal view returns (uint256 result) {
        assembly {
            if iszero(assetAddress) {
                // This is ETH.
                result := balance(address())
            }
            if assetAddress {
                // Is this a token.
                let ptr := mload(0x40)
                mstore(ptr, BALANCE_OF_SELECTOR)
                mstore(add(ptr, 0x4), address())
                if iszero(staticcall(gas(), assetAddress, ptr, 0x24, ptr, 0x20)) {
                    // Call failed.
                    revert(0x00, 0x00)
                }
                result := mload(ptr)
            }
        }
    }

    function transferTokens(
        address assetAddress,
        address to,
        uint256 amount
    ) internal {
        bool success = false;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, TRANSFER_SELECTOR)
            mstore(add(ptr, 0x4), to)
            mstore(add(ptr, 0x24), amount)
            // is this correct or should we forward the correct amount
            success := call(gas(), assetAddress, 0, ptr, 0x44, ptr, 0)
        }
        require(success, "DEFI_BRIDGE_PROXY TRANSFER_FAILED");
    }

    function convert(
        address bridgeAddress,
        AztecTypes.AztecAsset memory inputAssetA,
        AztecTypes.AztecAsset memory inputAssetB,
        AztecTypes.AztecAsset memory outputAssetA,
        AztecTypes.AztecAsset memory outputAssetB,
        uint256 totalInputValue,
        uint256 interactionNonce,
        uint256 auxInputData // (auxData)
    )
        external
        returns (
            uint256 outputValueA,
            uint256 outputValueB,
            bool isAsync
        )
    {
        if (inputAssetA.assetType == AztecTypes.AztecAssetType.ERC20) {
            // Transfer totalInputValue to the bridge contract if erc20. ETH is sent on call to convert.
            transferTokens(inputAssetA.erc20Address, bridgeAddress, totalInputValue);
        }

        uint256 tempValueA;
        uint256 tempValueB;

        if (outputAssetA.assetType != AztecTypes.AztecAssetType.VIRTUAL) {
            tempValueA = getBalance(outputAssetA.erc20Address);
        }

        if (outputAssetB.assetType != AztecTypes.AztecAssetType.VIRTUAL) {
            tempValueB = getBalance(outputAssetB.erc20Address);
        }

        // Call bridge.convert(), which will return output values for the two output assets.
        // If input is ETH, send it along with call to convert.
        IDefiBridge bridgeContract = IDefiBridge(bridgeAddress);
        (outputValueA, outputValueB, isAsync) = bridgeContract.convert{
            value: inputAssetA.assetType == AztecTypes.AztecAssetType.ETH ? totalInputValue : 0
        }(
            inputAssetA,
            inputAssetB,
            outputAssetA,
            outputAssetB,
            totalInputValue,
            interactionNonce,
            uint64(auxInputData)
        );

        if (
            outputAssetA.assetType != AztecTypes.AztecAssetType.VIRTUAL &&
            outputAssetA.assetType != AztecTypes.AztecAssetType.NOT_USED
        ) {
            require(
                outputValueA == SafeMath.sub(getBalance(outputAssetA.erc20Address), tempValueA),
                'DefiBridgeProxy: INCORRECT_ASSET_VALUE'
            );
        }

        if (
            outputAssetB.assetType != AztecTypes.AztecAssetType.VIRTUAL &&
            outputAssetB.assetType != AztecTypes.AztecAssetType.NOT_USED
        ) {
            require(
                outputValueB == SafeMath.sub(getBalance(outputAssetB.erc20Address), tempValueB),
                'DefiBridgeProxy: INCORRECT_ASSET_VALUE'
            );
        }

        if (isAsync) {
            require(outputValueA == 0 && outputValueB == 0, 'DefiBridgeProxy: ASYNC_NONZERO_OUTPUT_VALUES');
        }
    }
}
