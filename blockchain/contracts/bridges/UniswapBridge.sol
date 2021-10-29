// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import {UniswapV2Library} from '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import {IUniswapV2Router02} from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

import {IDefiBridge} from '../interfaces/IDefiBridge.sol';
import {IERC20Permit} from '../interfaces/IERC20Permit.sol';

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
        address inputAsset,
        address outputAsset,
        address, /* outputAssetB */
        uint256 inputValue,
        uint256, /* interactionNonce */
        uint32, /* openingNonce */
        uint32, /* bitConfig */
        uint64 /* auxData */
    )
        external
        payable
        override
        returns (
            uint256 outputValueA,
            uint256,
            bool isAsync
        )
    {
        require(msg.sender == rollupProcessor, 'UniswapBridge: INVALID_CALLER');
        isAsync = false;
        uint256[] memory amounts;
        uint256 deadline = block.timestamp;
        if (inputAsset == address(0)) {
            address[] memory path = new address[](2);
            path[0] = weth;
            path[1] = outputAsset;
            amounts = router.swapExactETHForTokens{value: inputValue}(0, path, rollupProcessor, deadline);
            outputValueA = amounts[1];
        } else if (outputAsset == address(0)) {
            address[] memory path = new address[](2);
            path[0] = inputAsset;
            path[1] = weth;
            require(IERC20Permit(inputAsset).approve(address(router), inputValue), 'UniswapBridge: APPROVE_FAILED');
            amounts = router.swapExactTokensForETH(inputValue, 0, path, rollupProcessor, deadline);
            outputValueA = amounts[1];
        } else {
            address[] memory path = new address[](3);
            path[0] = inputAsset;
            path[1] = weth;
            path[2] = outputAsset;
            require(IERC20Permit(inputAsset).approve(address(router), inputValue), 'UniswapBridge: APPROVE_FAILED');
            amounts = router.swapExactTokensForTokens(inputValue, 0, path, rollupProcessor, deadline);
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
