// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {Decoder} from "core/Decoder.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {TestBase} from "../aztec/TestBase.sol";

contract StateTest is TestBase, Decoder {
    function testShouldUpdateMerkleTreeState() public {
        _createWithdrawal();

        // Compute rollup and based on that new state hash
        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();
        (,, bytes32 expectedNewStateHash,,) = computeRootHashes(encodedProofData);

        // Submit the rollup batch
        vm.prank(ROLLUP_PROVIDER);
        rollupProcessor.processRollup(encodedProofData, signatures);

        assertEq(rollupProcessor.rollupStateHash(), expectedNewStateHash);
    }

    function testShouldPass3RollupsWhereTheIntermediateHasOddSize() public {
        for (uint256 i = 0; i < 28; ++i) {
            _createWithdrawal();
        }
        rollupEncoder.processRollup();

        for (uint256 i = 0; i < 3; ++i) {
            _createWithdrawal();
        }
        rollupEncoder.processRollup();

        for (uint256 i = 0; i < 28; ++i) {
            _createWithdrawal();
        }
        rollupEncoder.processRollup();
    }

    function testShouldRejectBatchWithIncorrectRollupId() public {
        _createWithdrawal();

        // Compute rollup
        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();

        // Set incorrect rollupId (no rollup was sent yet so should be 0)
        uint256 incorrectRollupId = 666;
        assembly {
            mstore(add(encodedProofData, add(0x20, mul(0x20, 0))), incorrectRollupId)
        }

        (, bytes32 expectedOldStateHash, bytes32 expectedNewStateHash,,) = computeRootHashes(encodedProofData);

        // Submit the rollup batch
        vm.prank(ROLLUP_PROVIDER);
        vm.expectRevert(
            abi.encodeWithSelector(
                RollupProcessorV2.INCORRECT_STATE_HASH.selector, expectedOldStateHash, expectedNewStateHash
            )
        );
        rollupProcessor.processRollup(encodedProofData, signatures);
    }

    function testShouldRejectBatchWithIncorrectDataStartIndex() public {
        _createWithdrawal();

        // Compute rollup
        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();

        // Set incorrect data start index
        uint256 incorrectDataStartIndex = 666;
        assembly {
            let dataStart := add(encodedProofData, 0x20) // jump over first word, it's length of data
            mstore(add(dataStart, 0x40), incorrectDataStartIndex)
        }

        uint256 expectedDataStartIndex = 0;

        // Submit the rollup batch
        vm.prank(ROLLUP_PROVIDER);
        vm.expectRevert(
            abi.encodeWithSelector(
                RollupProcessorV2.INCORRECT_DATA_START_INDEX.selector, incorrectDataStartIndex, expectedDataStartIndex
            )
        );
        rollupProcessor.processRollup(encodedProofData, signatures);
    }

    function testShouldRejectSecondBatchWithIncorrectDataStartIndex() public {
        _createWithdrawal();
        rollupEncoder.processRollup();

        // Create second deposit
        _createWithdrawal();

        // Compute rollup
        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();

        // Set incorrect data start index
        uint256 incorrectDataStartIndex = 665;
        assembly {
            let dataStart := add(encodedProofData, 0x20) // jump over first word, it's length of data
            mstore(add(dataStart, 0x40), incorrectDataStartIndex)
        }

        uint256 expectedDataStartIndex = 2;

        // Submit the rollup batch
        vm.prank(ROLLUP_PROVIDER);
        vm.expectRevert(
            abi.encodeWithSelector(
                RollupProcessorV2.INCORRECT_DATA_START_INDEX.selector, incorrectDataStartIndex, expectedDataStartIndex
            )
        );
        rollupProcessor.processRollup(encodedProofData, signatures);
    }

    function testShouldRejectBatchWithIncorrectOldDataRoot() public {
        _testShouldRejectBatchWithIncorrectOldRoot(3);
    }

    function testShouldRejectBatchWithIncorrectOldNullRoot() public {
        _testShouldRejectBatchWithIncorrectOldRoot(5);
    }

    function testShouldRejectBatchWithIncorrectOldDataRootsRoot() public {
        _testShouldRejectBatchWithIncorrectOldRoot(7);
    }

    function testShouldRejectBatchWithIncorrectOldDefiRoot() public {
        _testShouldRejectBatchWithIncorrectOldRoot(9);
    }

    function _testShouldRejectBatchWithIncorrectOldRoot(uint256 _positionMultiplier) private {
        _createWithdrawal();

        // Compute rollup
        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();

        // Set incorrect data start index
        uint256 incorrectOldRoot = 666;
        assembly {
            mstore(add(encodedProofData, add(0x20, mul(0x20, _positionMultiplier))), incorrectOldRoot)
        }

        (, bytes32 expectedOldStateHash, bytes32 expectedNewStateHash,,) = computeRootHashes(encodedProofData);

        // Submit the rollup batch
        vm.prank(ROLLUP_PROVIDER);
        vm.expectRevert(
            abi.encodeWithSelector(
                RollupProcessorV2.INCORRECT_STATE_HASH.selector, expectedOldStateHash, expectedNewStateHash
            )
        );
        rollupProcessor.processRollup(encodedProofData, signatures);
    }

    // @dev The only purpose of this function is to ensure that rollup batch is not empty
    function _createWithdrawal() private {
        uint256 withdrawAmount = 1 ether;
        deal(address(rollupProcessor), withdrawAmount);
        rollupEncoder.withdrawL2(0, withdrawAmount, address(0x20));
    }
}
