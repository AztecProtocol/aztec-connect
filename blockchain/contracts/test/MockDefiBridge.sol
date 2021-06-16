// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import {IDefiBridge} from '../interfaces/IDefiBridge.sol';

/**
 * @dev Warning: do not deploy in real environments, for testing only
 */
contract MockDefiBridge is IDefiBridge {
    uint32 public immutable numOutputAssets;
    address public immutable inputAsset;
    address public immutable outputAssetA;
    address public immutable outputAssetB;
    uint256 minInputValue;
    uint256 outputValueA;
    uint256 outputValueB;

    constructor(
        uint32 _numOutputAssets,
        address _inputAsset,
        address _outputAssetA,
        address _outputAssetB,
        uint256 _minInputValue,
        uint256 _outputValueA,
        uint256 _outputValueB
    ) public {
        numOutputAssets = _numOutputAssets;
        inputAsset = _inputAsset;
        outputAssetA = _outputAssetA;
        outputAssetB = _outputAssetB;
        minInputValue = _minInputValue;
        outputValueA = _outputValueA;
        outputValueB = _outputValueB;
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

    function convert(uint256 inputValue) external override returns (uint256, uint256) {
        require(inputValue >= minInputValue);

        IERC20(inputAsset).transferFrom(msg.sender, address(this), inputValue);

        if (outputValueA > 0 && outputAssetA != address(0)) {
            IERC20(outputAssetA).approve(msg.sender, outputValueA);
        }

        if (outputValueB > 0 && outputAssetB != address(0)) {
            IERC20(outputAssetB).approve(msg.sender, outputValueB);
        }

        return (outputValueA, outputValueB);
    }
}
