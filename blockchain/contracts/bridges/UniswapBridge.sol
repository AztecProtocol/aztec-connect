// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;
pragma experimental ABIEncoderV2;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import {UniswapV2Library} from '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import {IUniswapV2Router02} from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

import {IDefiBridge} from '../interfaces/IDefiBridge.sol';
import {IERC20Permit} from '../interfaces/IERC20Permit.sol';

import {AztecTypes} from '../AztecTypes.sol';

// import 'hardhat/console.sol';

contract UniswapBridge is IDefiBridge {
    using SafeMath for uint256;

    address public immutable rollupProcessor;
    address public weth;

    IUniswapV2Router02 router;

    constructor(address _rollupProcessor, address _router) public {
        rollupProcessor = _rollupProcessor;
        router = IUniswapV2Router02(_router);
        weth = router.WETH();
    }

    function convert(
        AztecTypes.AztecAsset memory inputAssetA,
        AztecTypes.AztecAsset memory inputAssetB,
        AztecTypes.AztecAsset memory outputAssetA,
        AztecTypes.AztecAsset memory outputAssetB,
        uint256 totalInputValue,
        uint256 /*interactionNonce*/,
        uint64 /*auxData*/
    )
        external
        payable
        override
        returns (
            uint256 outputValueA,
            uint256 outputValueB,
            bool isAsync
        )
    {
        // ### INITIALIZATION AND SANITY CHECKS
        require(msg.sender == rollupProcessor, 'UniswapBridge: INVALID_CALLER');
        require(inputAssetB.assetType == AztecTypes.AztecAssetType.NOT_USED, 'UniswapBridge: EXPECTED_SECOND_INPUT_ASSET_NOT_USED');
        require(outputAssetB.assetType == AztecTypes.AztecAssetType.NOT_USED, 'UniswapBridge: EXPECTED_SECOND_OUTPUT_ASSET_NOT_USED');
        outputValueB = 0;
        isAsync = false;

        // ### BRIDGE LOGIC
        uint256[] memory amounts;
        uint256 deadline = block.timestamp;
        if (inputAssetA.assetType == AztecTypes.AztecAssetType.ETH) {
            require(outputAssetA.assetType != AztecTypes.AztecAssetType.ETH, 'UniswapBridge: INPUT_AND_OUTPUT_BOTH_ETH!');
            address[] memory path = new address[](2);
            path[0] = weth;
            path[1] = outputAssetA.erc20Address;
            amounts = router.swapExactETHForTokens{value: totalInputValue}(0, path, rollupProcessor, deadline);
            outputValueA = amounts[1];
        } else if (outputAssetA.assetType == AztecTypes.AztecAssetType.ETH) {
            address[] memory path = new address[](2);
            path[0] = inputAssetA.erc20Address;
            path[1] = weth;
            require(IERC20Permit(inputAssetA.erc20Address).approve(address(router), totalInputValue), 'UniswapBridge: APPROVE_FAILED');
            amounts = router.swapExactTokensForETH(totalInputValue, 0, path, rollupProcessor, deadline);
            outputValueA = amounts[1];
        } else {
            require(inputAssetA.assetType == AztecTypes.AztecAssetType.ERC20, 'UniswapBridge: INPUT_ASSET_A_NOT_ETH_OR_ERC20');
            require(outputAssetA.assetType == AztecTypes.AztecAssetType.ERC20, 'UniswapBridge: OUTPUT_ASSET_A_NOT_ETH_OR_ERC20');
            address[] memory path = new address[](3);
            path[0] = inputAssetA.erc20Address;
            path[1] = weth;
            path[2] = outputAssetA.erc20Address;
            require(IERC20Permit(inputAssetA.erc20Address).approve(address(router), totalInputValue), 'UniswapBridge: APPROVE_FAILED');
            amounts = router.swapExactTokensForTokens(totalInputValue, 0, path, rollupProcessor, deadline);
            outputValueA = amounts[2];
        }
    }

    function canFinalise(
        uint256 /*interactionNonce*/
    ) external view override returns (bool) {
        return false;
    }

    function finalise(
        address, /* inputAsset */
        address, /* outputAssetA */
        address, /* outputAssetB */
        uint256, /* interactionNonce */
        uint32 /* bitConfig */
    ) external payable override {
        require(false);
    }
}
