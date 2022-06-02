// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import {IDefiBridge} from '../interfaces/IDefiBridge.sol';
import {AztecTypes} from '../AztecTypes.sol';
import {IRollupProcessor} from '../interfaces/IRollupProcessor.sol';

/**
 * @dev Warning: do not deploy in real environments, for testing only
 */
contract FailingAsyncBridge is IDefiBridge {
    address public immutable rollupProcessor;

    uint256 public a;
    uint256 public b;

    receive() external payable {}

    constructor(address _rollupProcessor) {
        rollupProcessor = _rollupProcessor;
    }

    function setReturnValues(uint256 _a, uint256 _b) public {
        a = _a;
        b = _b;
    }

    function convert(
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        uint256,
        uint256,
        uint64,
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
        return (a, b, true);
    }

    function canFinalise(uint256) external pure override returns (bool) {
        return true;
    }

    function finalise(
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        uint256,
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
        return (1, 0, true);
    }
}
