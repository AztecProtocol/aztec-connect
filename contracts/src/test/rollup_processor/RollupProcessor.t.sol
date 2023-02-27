// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {EmptyContract} from "../mocks/EmptyContract.sol";

contract RollupProcessorTest is TestBase {
    // Copied from RollupProcessorV2
    uint256 private constant VIRTUAL_ASSET_ID_FLAG_SHIFT = 29;
    uint256 private constant MIN_BRIDGE_GAS_LIMIT = 35000;
    uint256 private constant MIN_ERC20_GAS_LIMIT = 55000;
    uint256 private constant MAX_BRIDGE_GAS_LIMIT = 5000000;
    uint256 private constant MAX_ERC20_GAS_LIMIT = 1500000;

    address internal addressWithCode;

    function setUp() public override(TestBase) {
        super.setUp();
        rollupProcessor.grantRole(rollupProcessor.LISTER_ROLE(), address(this));

        addressWithCode = address(new EmptyContract());
    }

    function testRollupProviderSet() public {
        assertEq(rollupProcessor.rollupProviders(ROLLUP_PROVIDER), true);
    }

    function testCheckInitialCapValuesForEth() public {
        (uint128 available, uint32 lastUpdatedTimestamp, uint32 pendingCap, uint32 dailyCap, uint8 precision) =
            rollupProcessor.caps(0); // ethAssetId

        assertEq(available, uint128(1000e18), "Incorrect available");
        assertEq(lastUpdatedTimestamp, block.timestamp, "Incorrect timestamp");
        assertEq(pendingCap, 6, "Incorrect pending cap");
        assertEq(dailyCap, 1000, "Incorrect daily cap");
        assertEq(precision, 18, "Incorrect precision");
    }

    function testCheckInitialCapValuesForNoCapAsset() public {
        (uint128 available, uint32 lastUpdatedTimestamp, uint32 pendingCap, uint32 dailyCap, uint8 precision) =
            rollupProcessor.caps(2);

        assertEq(available, 0, "Incorrect available");
        assertEq(lastUpdatedTimestamp, 0, "Incorrect timestamp");
        assertEq(pendingCap, 0, "Incorrect pending cap");
        assertEq(dailyCap, 0, "Incorrect daily cap");
        assertEq(precision, 0, "Incorrect precision");
    }

    function testRevertsWhenUpperEscapeHatchBoundSmallerThanLower() public {
        vm.expectRevert(RollupProcessorV2.INVALID_ESCAPE_BOUNDS.selector);
        new RollupProcessorV2(100, 80);
    }

    function testRevertsWhenEscapeHatchBoundAreEqual() public {
        vm.expectRevert(RollupProcessorV2.INVALID_ESCAPE_BOUNDS.selector);
        new RollupProcessorV2(100, 100);
    }

    function testRevertsWhenLowerEscapeHatchBoundIs0() public {
        vm.expectRevert(RollupProcessorV2.INVALID_ESCAPE_BOUNDS.selector);
        new RollupProcessorV2(0, 80);
    }

    // @dev lastRollupTimeStamp + delay > uint32 should not overflow
    function testGettingEscapeHatchShouldNotOverflowWithMaxDelay() public {
        rollupProcessor.setDelayBeforeEscapeHatch(type(uint32).max);
        rollupProcessor.getEscapeHatchStatus();
    }

    function testContinuousCallsToSetCappedShouldNotUpdateLastRollupTimeStamp() public {
        uint256 firstTimeStamp = rollupProcessor.lastRollupTimeStamp();

        vm.recordLogs();

        rollupProcessor.setCapped(true);

        assertEq(rollupProcessor.lastRollupTimeStamp(), firstTimeStamp, "Timestamp incorrectly updated");
        assertEq(vm.getRecordedLogs().length, 0, "Event got unexpectedly emitted");

        rollupProcessor.setCapped(true);

        assertEq(rollupProcessor.lastRollupTimeStamp(), firstTimeStamp, "Timestamp incorrectly updated");
        assertEq(vm.getRecordedLogs().length, 0, "Event got unexpectedly emitted");
    }

    function testRevertsWhenGettingVirtualAsset(uint256 _assetId) public {
        uint256 assetId = bound(_assetId, 1 << VIRTUAL_ASSET_ID_FLAG_SHIFT, type(uint256).max);

        vm.expectRevert(RollupProcessorV2.INVALID_ASSET_ID.selector);
        rollupProcessor.getSupportedAsset(assetId);
    }

    function testRevertsWhenSettingNewSupportedAssetBellowMinimumGasLimit(uint256 _gasLimit) public {
        uint256 gasLimit = bound(_gasLimit, 0, MIN_ERC20_GAS_LIMIT - 1);
        vm.expectRevert(RollupProcessorV2.INVALID_ASSET_GAS.selector);
        rollupProcessor.setSupportedAsset(address(addressWithCode), gasLimit);
    }

    function testRevertsWhenSettingNewSupportedAssetAboveMinimumGasLimit(uint256 _gasLimit) public {
        uint256 gasLimit = bound(_gasLimit, MAX_ERC20_GAS_LIMIT + 1, type(uint256).max);
        vm.expectRevert(RollupProcessorV2.INVALID_ASSET_GAS.selector);
        rollupProcessor.setSupportedAsset(address(addressWithCode), gasLimit);
    }

    function testRevertsWhenSettingNewSupportedBridgeBellowMinimumGasLimit(uint256 _gasLimit) public {
        uint256 gasLimit = bound(_gasLimit, 0, MIN_BRIDGE_GAS_LIMIT - 1);
        vm.expectRevert(RollupProcessorV2.INVALID_BRIDGE_GAS.selector);
        rollupProcessor.setSupportedBridge(address(addressWithCode), gasLimit);
    }

    function testRevertsWhenSettingNewSupportedBridgeAboveMinimumGasLimit(uint256 _gasLimit) public {
        uint256 gasLimit = bound(_gasLimit, MAX_BRIDGE_GAS_LIMIT + 1, type(uint256).max);
        vm.expectRevert(RollupProcessorV2.INVALID_BRIDGE_GAS.selector);
        rollupProcessor.setSupportedBridge(address(addressWithCode), gasLimit);
    }

    function testOwnerCanSetAllowThirdPartyContractFlag() public {
        // another address cannot set the flag
        vm.prank(address(0xbeefbabe));
        vm.expectRevert();
        rollupProcessor.setAllowThirdPartyContracts(true);

        assertEq(rollupProcessor.allowThirdPartyContracts(), false, "Flag not set");
        rollupProcessor.setAllowThirdPartyContracts(true);
        assertEq(rollupProcessor.allowThirdPartyContracts(), true, "Flag not set");
    }
}
