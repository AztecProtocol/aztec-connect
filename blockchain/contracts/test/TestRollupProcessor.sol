// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec

pragma solidity >=0.6.0 <0.8.11;
pragma experimental ABIEncoderV2;

import {RollupProcessor} from '../RollupProcessor.sol';

/**
 * @title Rollup processor contract
 * @dev Warning: do not deploy in real environments, for testing only
 * Adds some methods to fiddle around with storage vars
 */
contract TestRollupProcessor is RollupProcessor {
    constructor(uint256 _escapeBlockLowerBound, uint256 _escapeBlockUpperBound)
        RollupProcessor(_escapeBlockLowerBound, _escapeBlockUpperBound)
    {}

    // Used to pre-fund the rollup with some Eth (to mimic deposited Eth for defi interactions)
    receive() external payable {}

    // Used to test we correctly check the length of asyncDefiTransactionHashes
    function stubAsyncTransactionHashesLength(uint256 size) public {
        rollupState.numAsyncDefiInteractionHashes = uint16(size);
    }

    // Used to test we correctly check length of defiTransactionhashes
    function stubTransactionHashesLength(uint256 size) public {
        rollupState.numDefiInteractionHashes = uint16(size);
        assembly {
            mstore(0x00, defiInteractionHashes.slot)
            // Write the 'zero-hash' into the last `numberOfBridgeCalls` entries to ensure that computed
            // defiInteractionHash will be correct
            let slot := keccak256(0x00, 0x20)
            for {
                let i := 0
            } lt(i, NUMBER_OF_BRIDGE_CALLS) {
                i := add(i, 1)
            } {
                sstore(
                    add(slot, sub(size, add(i, 1))),
                    0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4
                )
            }
        }
    }
}

contract UpgradedTestRollupProcessorV0 is TestRollupProcessor {
    constructor(uint256 _escapeBlockLowerBound, uint256 _escapeBlockUpperBound)
        TestRollupProcessor(_escapeBlockLowerBound, _escapeBlockUpperBound)
    {}

    function getImplementationVersion() public pure override returns (uint8) {
        return 0;
    }
}

contract UpgradedTestRollupProcessorV2 is TestRollupProcessor {
    constructor(uint256 _escapeBlockLowerBound, uint256 _escapeBlockUpperBound)
        TestRollupProcessor(_escapeBlockLowerBound, _escapeBlockUpperBound)
    {}

    function getImplementationVersion() public pure override returns (uint8) {
        return 2;
    }
}
