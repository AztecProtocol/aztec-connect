// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.8.4 <0.8.11;
pragma experimental ABIEncoderV2;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import {IDefiBridge} from '../interfaces/IDefiBridge.sol';
import {AztecTypes} from '../AztecTypes.sol';

import 'hardhat/console.sol';

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

    enum AUX_DATA_SELECTOR {
        NADA,
        OPEN_LOAN,
        CLOSE_LOAN,
        OPEN_LP,
        CLOSE_LP
    }

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

    // Input cases:
    // Case1: 1 real input.
    // Case2: 1 virtual asset input.
    // Case3: 1 real 1 virtual input.

    // Output cases:
    // 1 real
    // 2 real
    // 1 real 1 virtual
    // 1 virtual

    // E2E example use cases.
    // 1 1: Swapping.
    // 1 2: Swapping with incentives (2nd output reward token).
    // 1 3: Borrowing. Lock up collateral, get back loan asset and virtual position asset.
    // 1 4: Opening lending position OR Purchasing NFT. Input real asset, get back virtual asset representing NFT or position.
    // 2 1: Selling NFT. Input the virtual asset, get back a real asset.
    // 2 2: Closing a lending position. Get back original asset and reward asset.
    // 2 3: Claiming fees from an open position.
    // 2 4: Voting on a 1 4 case.
    // 3 1: Repaying a borrow. Return loan plus interest. Get collateral back.
    // 3 2: Repaying a borrow. Return loan plus interest. Get collateral plus reward token. (AAVE)
    // 3 3: Partial loan repayment.
    // 3 4: DAO voting stuff.
    function convert(
        AztecTypes.AztecAsset memory inputAssetA,
        AztecTypes.AztecAsset memory inputAssetB,
        AztecTypes.AztecAsset memory outputAssetA,
        AztecTypes.AztecAsset memory outputAssetB,
        uint256 totalInputValue,
        uint256 interactionNonce,
        uint64 auxData
    )
        external
        payable
        override
        returns (
            uint256 outputValueA,
            uint256 outputValueB,
            bool _isAsync
        )
    {
        require(canConvert);

        uint256 modifiedReturnValueA = returnValueA;
        if (auxData == uint32(AUX_DATA_SELECTOR.CLOSE_LOAN) && inputAssetB.id > 0) {
            require(
                inputAssetB.assetType == AztecTypes.AztecAssetType.VIRTUAL,
                'MockDefiBridge: INPUT_ASSET_A_NOT_VIRTUAL'
            );
            // get interest rate from the mapping interestRates
            modifiedReturnValueA -= (returnValueA * interestRates[inputAssetB.id]) / 100;
        }

        if (!isAsync) {
            transferTokens(inputAssetA, returnInputValue);
            transferTokens(outputAssetA, modifiedReturnValueA);
            transferTokens(outputAssetB, returnValueB);
        }
        interactions[interactionNonce] = totalInputValue;
        if (isAsync) {
            return (0, 0, isAsync);
        }
        return (modifiedReturnValueA, returnValueB, isAsync);
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

        bytes memory payload = abi.encodeWithSignature(
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

    function transferTokens(AztecTypes.AztecAsset memory asset, uint256 value) internal {
        if (
            asset.assetType == AztecTypes.AztecAssetType.NOT_USED ||
            asset.assetType == AztecTypes.AztecAssetType.VIRTUAL
        ) {
            return;
        } else if (asset.assetType == AztecTypes.AztecAssetType.ETH) {
            rollupProcessor.call{value: value}('');
        } else {
            IERC20(asset.erc20Address).transfer(rollupProcessor, value);
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
