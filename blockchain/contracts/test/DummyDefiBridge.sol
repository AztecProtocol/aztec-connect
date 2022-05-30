// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IDefiBridge} from '../interfaces/IDefiBridge.sol';
import {AztecTypes} from '../AztecTypes.sol';

/**
 * @dev Warning: do not deploy in real environments, for testing only
 */
contract DummyDefiBridge is IDefiBridge {
    address public immutable rollupProcessor;
    uint256 immutable outputValueEth;
    uint256 immutable outputValueToken;
    uint256 immutable outputVirtualValueA;
    uint256 immutable outputVirtualValueB;

    receive() external payable {}

    constructor(
        address _rollupProcessor,
        uint256 _outputValueEth,
        uint256 _outputValueToken,
        uint256 _outputVirtualValueA,
        uint256 _outputVirtualValueB
    ) {
        rollupProcessor = _rollupProcessor;
        outputValueEth = _outputValueEth;
        outputValueToken = _outputValueToken;
        outputVirtualValueA = _outputVirtualValueA;
        outputVirtualValueB = _outputVirtualValueB;
    }

    function convert(
        AztecTypes.AztecAsset memory, /*inputAssetA*/
        AztecTypes.AztecAsset memory, /*inputAssetB*/
        AztecTypes.AztecAsset memory outputAssetA,
        AztecTypes.AztecAsset memory outputAssetB,
        uint256, /*totalInputValue*/
        uint256 interactionNonce,
        uint64 auxData,
        address
    )
        external
        payable
        override
        returns (
            uint256,
            uint256,
            bool
        )
    {
        bool isAsync = auxData > 0;
        if (isAsync) {
            return (0, 0, isAsync);
        }

        uint256 returnValueA = approveTransfer(outputAssetA, outputVirtualValueA, interactionNonce);
        uint256 returnValueB = approveTransfer(outputAssetB, outputVirtualValueB, interactionNonce);
        return (returnValueA, returnValueB, isAsync);
    }

    function canFinalise(
        uint256 /*interactionNonce*/
    ) external pure override returns (bool) {
        return true;
    }

    function finalise(
        AztecTypes.AztecAsset memory, /*inputAssetA*/
        AztecTypes.AztecAsset memory, /*inputAssetB*/
        AztecTypes.AztecAsset memory outputAssetA,
        AztecTypes.AztecAsset memory outputAssetB,
        uint256 interactionNonce,
        uint64
    )
        external
        payable
        override
        returns (
            uint256,
            uint256,
            bool
        )
    {
        require(msg.sender == rollupProcessor, 'invalid sender!');

        uint256 returnValueA = approveTransfer(outputAssetA, outputVirtualValueA, interactionNonce);
        uint256 returnValueB = approveTransfer(outputAssetB, outputVirtualValueB, interactionNonce);
        return (returnValueA, returnValueB, true);
    }

    function approveTransfer(
        AztecTypes.AztecAsset memory asset,
        uint256 virtualValue,
        uint256 interactionNonce
    ) internal returns (uint256 returnValue) {
        if (asset.assetType == AztecTypes.AztecAssetType.VIRTUAL) {
            returnValue = virtualValue;
        } else if (asset.assetType == AztecTypes.AztecAssetType.ETH) {
            returnValue = outputValueEth;
            bytes memory payload = abi.encodeWithSignature('receiveEthFromBridge(uint256)', interactionNonce);
            (bool success, ) = address(rollupProcessor).call{value: outputValueEth}(payload);
            assembly {
                if iszero(success) {
                    returndatacopy(0x00, 0x00, returndatasize())
                    revert(0x00, returndatasize())
                }
            }
        } else if (asset.assetType == AztecTypes.AztecAssetType.ERC20) {
            returnValue = outputValueToken;
            IERC20(asset.erc20Address).approve(rollupProcessor, outputValueToken);
        }
    }
}
