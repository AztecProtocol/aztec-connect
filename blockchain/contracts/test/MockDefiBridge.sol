// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import {IDefiBridge} from '../interfaces/IDefiBridge.sol';

import 'hardhat/console.sol';

/**
 * @dev Warning: do not deploy in real environments, for testing only
 */
contract MockDefiBridge is IDefiBridge {
    address public immutable rollupProcessor;

    bool immutable canConvert;
    bool immutable isAsync;
    uint256 immutable outputValueA;
    uint256 immutable outputValueB;
    uint256 immutable returnValueA;
    uint256 immutable returnValueB;
    uint256 immutable returnInputValue;

    mapping(uint256 => uint256) interestRates;

    mapping(uint256 => uint256) interactions;

    enum AUX_DATA {NADA, OPEN_LOAN, CLOSE_LOAN, OPEN_LIQUIDITY_PROVIDER, CLOSE_LIQUIDITY_PROVIDER}

    receive() external payable {}

    constructor(
        address _rollupProcessor,
        bool _canConvert,
        uint256 _outputValueA,
        uint256 _outputValueB,
        uint256 _returnValueA,
        uint256 _returnValueB,
        uint256 _returnInputValue,
        bool _isAsync
    ) public {
        rollupProcessor = _rollupProcessor;
        canConvert = _canConvert;
        outputValueA = _outputValueA;
        outputValueB = _outputValueB;
        returnValueA = _returnValueA;
        returnValueB = _returnValueB;
        returnInputValue = _returnInputValue;
        isAsync = _isAsync;
    }

    function convert(
        address inputAsset,
        address outputAssetA,
        address outputAssetB,
        uint256 inputValue,
        uint256 interactionNonce,
        uint32 openingNonce,
        uint32 bitConfig,
        uint64 auxData
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
        require(canConvert);

        uint256 modifiedReturnValueA = returnValueA;
        if (auxData == uint32(AUX_DATA.CLOSE_LOAN) && openingNonce > 0) {
            // get interest rate from the mapping interestRates
            modifiedReturnValueA -= (returnValueA * interestRates[openingNonce]) / 100;
        }

        if (!isAsync) {
            transferTokens(inputAsset, returnInputValue);
            transferTokens(outputAssetA, modifiedReturnValueA);
            if ((bitConfig & 1) == 1) {
                transferTokens(outputAssetB, returnValueB);
            }
        }

        interactions[interactionNonce] = inputValue;
        return (0, 0, isAsync);
    }

    function recordInterestRate(uint256 interactionNonce, uint256 rate) external {
        interestRates[interactionNonce] = rate;
    }

    function canFinalise(
        uint256 /*interactionNonce*/
    ) external view override returns (bool) {
        return true;
    }

    function finalise(
        address inputAsset,
        address outputAssetA,
        address outputAssetB,
        uint256 interactionNonce,
        uint32 bitConfig
    ) external payable override {
        uint256 msgCallValue = 0;

        msgCallValue += approveTransfer(inputAsset, returnInputValue);
        msgCallValue += approveTransfer(outputAssetA, returnValueA);
        if ((bitConfig & 1) == 1) {
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
