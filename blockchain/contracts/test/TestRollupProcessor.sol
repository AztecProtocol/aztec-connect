// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {RollupProcessor} from '../RollupProcessor.sol';

/**
 * @title Rollup processor contract
 * @dev Warning: do not deploy in real environments, for testing only
 * Adds some methods to fiddle around with storage vars
 */
contract TestRollupProcessor is RollupProcessor {
    /**
     * @dev Max out async transactions array
     */

    constructor(
        address _verifierAddress,
        uint256 _escapeBlockLowerBound,
        uint256 _escapeBlockUpperBound,
        address _defiBridgeProxy,
        address _contractOwner
    )
        public
        RollupProcessor(
            _verifierAddress,
            _escapeBlockLowerBound,
            _escapeBlockUpperBound,
            _defiBridgeProxy,
            _contractOwner,
            bytes32(0x11977941a807ca96cf02d1b15830a53296170bf8ac7d96e5cded7615d18ec607),
            bytes32(0x1b831fad9b940f7d02feae1e9824c963ae45b3223e721138c6f73261e690c96a),
            bytes32(0x1b435f036fc17f4cc3862f961a8644839900a8e4f1d0b318a7046dd88b10be75),
            uint256(0)
        )
    {}

    // Used to test we correctly check the length of asyncDefiTransactionHashes
    function stubAsyncTransactionHashesLength(uint256 size) public {
        RollupProcessor.rollupState = bytes32(
            uint256(RollupProcessor.rollupState) | (size << ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET)
        );
    }

    // Used to test we correctly check length of defiTransactionhashes
    function stubTransactionHashesLength(uint256 size) public {
        RollupProcessor.rollupState = bytes32(
            uint256(RollupProcessor.rollupState) | (size << DEFIINTERACTIONHASHES_BIT_OFFSET)
        );
        assembly {
            mstore(0x00, defiInteractionHashes_slot)
            // Write the 'zero-hash' into the last 4 entries to ensure that computed
            // defiInteractionHash will be correct
            let slot := keccak256(0x00, 0x20)
            sstore(add(slot, sub(size, 1)), 0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4)
            sstore(add(slot, sub(size, 2)), 0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4)
            sstore(add(slot, sub(size, 3)), 0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4)
            sstore(add(slot, sub(size, 4)), 0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4)
        }
    }

    // Used to test that methods correctly revert if mutext is true
    function stubReentrancyGuard(bool value) public {
        uint256 foo;
        assembly {
            foo := value
        }
        RollupProcessor.rollupState = bytes32(
            uint256(RollupProcessor.rollupState) | (foo << REENTRANCY_MUTEX_BIT_OFFSET)
        );
    }
}
