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

    address public immutable inputAsset;
    address public immutable outputAsset;

    IUniswapV2Router02 router;

    constructor(
        address _rollupProcessor,
        address _router,
        address _inputAsset,
        address _outputAsset
    ) public {
        rollupProcessor = _rollupProcessor;
        router = IUniswapV2Router02(_router);
        inputAsset = _inputAsset;
        outputAsset = _outputAsset;
        weth = router.WETH();
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
        return (1, inputAsset, outputAsset, address(0));
    }

    function convert(uint256 inputValue) external payable override returns (uint256 outputValueA, uint256) {
        require(msg.sender == rollupProcessor, 'UniswapBridge: INVALID_CALLER');

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
}
