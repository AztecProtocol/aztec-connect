// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import {UniswapV2Library} from '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';

import {IDefiBridge} from '../interfaces/IDefiBridge.sol';

contract UniswapBridge is IDefiBridge {
    using SafeMath for uint256;

    bytes4 private constant FACTORY_SELECTOR = bytes4(keccak256('factory()'));
    bytes4 private constant SWAP_SELECTOR = bytes4(keccak256('swap(uint256,uint256,address,bytes)'));
    bytes4 private constant TRANSFER_SELECTOR = bytes4(keccak256('transfer(address,uint256)'));
    bytes4 private constant GET_RESERVES_SELECTOR = bytes4(keccak256('getReserves()'));

    address public immutable rollupProcessor;
    address public immutable router;
    address public immutable pair;

    address public immutable inputAsset;
    address public immutable outputAsset;

    constructor(
        address _rollupProcessor,
        address _router,
        address _inputAsset,
        address _outputAsset
    ) public {
        rollupProcessor = _rollupProcessor;
        router = _router;
        inputAsset = _inputAsset;
        outputAsset = _outputAsset;
        (, bytes memory data) = _router.staticcall(abi.encodeWithSelector(FACTORY_SELECTOR));
        address factory = abi.decode(data, (address));
        pair = UniswapV2Library.pairFor(factory, _inputAsset, _outputAsset);
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

    function convert(uint256 inputValue) external override returns (uint256 outputValueA, uint256) {
        require(msg.sender == rollupProcessor, 'UniswapBridge: INVALID_CALLER');

        bool success;

        (success, ) = inputAsset.call(abi.encodeWithSelector(TRANSFER_SELECTOR, pair, inputValue));
        require(success, 'UniswapBridge: TRANSFER_FAILED');

        outputValueA = getAmountOut(inputValue);
        (uint256 amountOut0, uint256 amountOut1) =
            inputAsset < outputAsset ? (uint256(0), outputValueA) : (outputValueA, uint256(0));

        (success, ) = pair.call(
            abi.encodeWithSelector(SWAP_SELECTOR, amountOut0, amountOut1, rollupProcessor, new bytes(0))
        );
        require(success, 'UniswapBridge: SWAP_FAILED');
    }

    function getAmountOut(uint256 inputValue) internal view returns (uint256 outputValue) {
        (, bytes memory data) = pair.staticcall(abi.encodeWithSelector(GET_RESERVES_SELECTOR));
        (uint256 reserve0, uint256 reserve1) = abi.decode(data, (uint256, uint256));
        (uint256 reserveIn, uint256 reserveOut) =
            inputAsset < outputAsset ? (reserve0, reserve1) : (reserve1, reserve0);
        outputValue = UniswapV2Library.getAmountOut(inputValue, reserveIn, reserveOut);
    }
}
