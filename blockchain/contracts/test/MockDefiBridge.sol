// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import {IDefiBridge} from '../interfaces/IDefiBridge.sol';

/**
 * @dev Warning: do not deploy in real environments, for testing only
 */
contract MockDefiBridge is IDefiBridge {
    address public immutable rollupProcessor;
    uint32 public immutable numOutputAssets;
    address public immutable inputAsset;
    address public immutable outputAssetA;
    address public immutable outputAssetB;

    bool immutable canConvert;
    bool immutable isAsync;
    uint256 immutable outputValueA;
    uint256 immutable outputValueB;
    uint256 immutable returnValueA;
    uint256 immutable returnValueB;
    uint256 immutable returnInputValue;

    mapping(uint256 => uint256) interactions;

    receive() external payable {}

    constructor(
        address _rollupProcessor,
        uint32 _numOutputAssets,
        address _inputAsset,
        address _outputAssetA,
        address _outputAssetB,
        bool _canConvert,
        uint256 _outputValueA,
        uint256 _outputValueB,
        uint256 _returnValueA,
        uint256 _returnValueB,
        uint256 _returnInputValue,
        bool _isAsync
    ) public {
        rollupProcessor = _rollupProcessor;
        numOutputAssets = _numOutputAssets;
        inputAsset = _inputAsset;
        outputAssetA = _outputAssetA;
        outputAssetB = _outputAssetB;
        canConvert = _canConvert;
        outputValueA = _outputValueA;
        outputValueB = _outputValueB;
        returnValueA = _returnValueA;
        returnValueB = _returnValueB;
        returnInputValue = _returnInputValue;
        isAsync = _isAsync;
    }

    function getInfo()
        external
        view
        override
        returns (
            uint32,
            address,
            address,
            address
        )
    {
        return (numOutputAssets, inputAsset, outputAssetA, outputAssetB);
    }

    function convert(uint256 inputValue, uint256 interactionNonce)
        external
        payable
        override
        returns (
            uint256,
            uint256,
            bool
        )
    {
        require(canConvert);

        if (!isAsync) {
            transferTokens(inputAsset, returnInputValue);
            transferTokens(outputAssetA, returnValueA);
            if (numOutputAssets == 2) {
                transferTokens(outputAssetB, returnValueB);
            }
        }

        interactions[interactionNonce] = inputValue;
        return (0, 0, isAsync);
    }

    function canFinalise(
        uint256 /*interactionNonce*/
    ) external view override returns (bool) {
        return true;
    }

    function finalise(uint256 interactionNonce) external payable override {
        uint256 msgCallValue = 0;

        msgCallValue += approveTransfer(inputAsset, returnInputValue);
        msgCallValue += approveTransfer(outputAssetA, returnValueA);
        if (numOutputAssets == 2) {
            msgCallValue += approveTransfer(outputAssetB, returnValueB);
        }

        bytes memory payload =
            abi.encodeWithSignature(
                'processAsyncDefiInteraction(uint256,uint256,uint256)',
                interactionNonce,
                outputValueA,
                outputValueB
            );
        (bool success, ) = address(rollupProcessor).call{value: msgCallValue}(payload);
        assembly {
            if iszero(success) {
                returndatacopy(0x00, 0x00, returndatasize())
                revert(0x00, returndatasize())
            }
        }
    }

    function transferTokens(address assetAddress, uint256 value) internal {
        if (assetAddress == address(0)) {
            rollupProcessor.call{value: value}('');
        } else {
            IERC20(assetAddress).transfer(rollupProcessor, value);
        }
    }

    function approveTransfer(address assetAddress, uint256 value) internal returns (uint256 msgCallValue) {
        if (assetAddress == address(0)) {
            msgCallValue = value;
        } else {
            IERC20(assetAddress).approve(rollupProcessor, value);
        }
    }
}
