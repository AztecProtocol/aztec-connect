// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {TestBase} from "../aztec/TestBase.sol";

contract PauseableTest is TestBase {
    uint256 private constant DEPOSITOR_PRIV_KEY = 0x676fa108d25db313eedc050f53eeedf8be73faa59bd405ecaa6a274fa3dfc101;
    address private constant DEPOSITOR = 0x96EA9a0C5010Dae807A279597080aa0dB1EeB10C;
    address private constant EMERGENCY_ROLE_HOLDER = address(0xbeef);
    address private constant RESUME_ROLE_HOLDER = address(0xdead);

    function setUp() public override {
        super.setUp();
        // Make escape hatch active
        vm.roll(rollupProcessor.escapeBlockLowerBound());
        (bool hatchOpen,) = rollupProcessor.getEscapeHatchStatus();
        assertTrue(hatchOpen, "escape hatch closed");

        rollupProcessor.grantRole(rollupProcessor.EMERGENCY_ROLE(), EMERGENCY_ROLE_HOLDER);
        rollupProcessor.grantRole(rollupProcessor.RESUME_ROLE(), RESUME_ROLE_HOLDER);

        vm.prank(EMERGENCY_ROLE_HOLDER);
        rollupProcessor.pause();
    }

    function testCannotPauseIfAlreadyPaused() public {
        vm.expectRevert(RollupProcessorV2.PAUSED.selector);
        rollupProcessor.pause();
    }

    function testCanUnpauseIfPaused() public {
        vm.prank(RESUME_ROLE_HOLDER);
        rollupProcessor.unpause();
    }

    function testCannotUnpausedWhenUnPaused() public {
        vm.prank(RESUME_ROLE_HOLDER);
        rollupProcessor.unpause();

        vm.expectRevert(RollupProcessorV2.NOT_PAUSED.selector);
        rollupProcessor.unpause();
    }

    function testCannotSetSupportedAssetWhenPaused() public {
        vm.expectRevert(RollupProcessorV2.PAUSED.selector);
        rollupProcessor.setSupportedAsset(EMERGENCY_ROLE_HOLDER, 1);
    }

    function testCannotSetSupportedBridgeWenPaused() public {
        vm.expectRevert(RollupProcessorV2.PAUSED.selector);
        rollupProcessor.setSupportedBridge(EMERGENCY_ROLE_HOLDER, 1);
    }

    function testCannotApproveProofWhenPaused() public {
        vm.expectRevert(RollupProcessorV2.PAUSED.selector);
        rollupProcessor.approveProof("");
    }

    function testCannotProcessAsyncDefiInteractionWhenPaused() public {
        vm.expectRevert(RollupProcessorV2.PAUSED.selector);
        rollupProcessor.processAsyncDefiInteraction(0);
    }

    function testCannotProcessRollupWhenPaused() public {
        vm.expectRevert(RollupProcessorV2.PAUSED.selector);
        rollupProcessor.processRollup("", "");
    }

    function testCannotPostOffchainDataWhenPaused() public {
        vm.expectRevert(RollupProcessorV2.PAUSED.selector);
        rollupProcessor.offchainData(1, 1, 1, "");
    }

    function testCannotDepositPendingFundsWhenPaused() public {
        uint256 depositAmount = 1 ether;
        vm.deal(DEPOSITOR, depositAmount);
        vm.prank(DEPOSITOR);
        vm.expectRevert(RollupProcessorV2.PAUSED.selector);
        rollupProcessor.depositPendingFunds{value: depositAmount}(0, depositAmount, DEPOSITOR, "");
    }
}
