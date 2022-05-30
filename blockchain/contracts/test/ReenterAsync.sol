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
contract ReentryAsync is IDefiBridge {
    address public immutable rollupProcessor;

    uint256 public nonce;
    uint256 public counter;
    uint256 public aOut;

    receive() external payable {}

    constructor(address _rollupProcessor) {
        rollupProcessor = _rollupProcessor;
    }

    function setValues(uint256 _nonce, uint256 _aOut) public {
        nonce = _nonce;
        aOut = _aOut;
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
        return (0, 0, true);
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
        require(msg.sender == rollupProcessor, 'invalid sender!');
        counter++;

        if (counter < 2) {
            IRollupProcessor(rollupProcessor).processAsyncDefiInteraction(nonce);
        }

        IRollupProcessor(rollupProcessor).receiveEthFromBridge{value: aOut}(nonce);

        return (aOut, 0, true);
    }
}
