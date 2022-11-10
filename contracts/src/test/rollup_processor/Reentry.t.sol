// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Reenter} from "../mocks/ERC20Reenter.sol";
import {SyncBridge} from "../mocks/SyncBridge.sol";
import {AsyncBridge} from "../mocks/AsyncBridge.sol";

contract ReentryTest is TestBase {
    SyncBridge internal syncBridge;
    AsyncBridge internal asyncBridge1;
    AsyncBridge internal asyncBridge2;

    uint256 internal syncBridgeAddressId;
    uint256 internal asyncBridge1AddressId;
    uint256 internal asyncBridge2AddressId;

    AztecTypes.AztecAsset internal emptyAsset;
    AztecTypes.AztecAsset internal ethAsset;

    function setUp() public override {
        super.setUp();
        rollupProcessor.grantRole(rollupProcessor.LISTER_ROLE(), address(this));

        ethAsset = AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.ETH});

        // Register the bridges with a large gas amount
        syncBridge = new SyncBridge();
        rollupProcessor.setSupportedBridge(address(syncBridge), 1000000);
        syncBridgeAddressId = rollupProcessor.getSupportedBridgesLength();

        asyncBridge1 = new AsyncBridge();
        rollupProcessor.setSupportedBridge(address(asyncBridge1), 1000000);
        asyncBridge1AddressId = rollupProcessor.getSupportedBridgesLength();

        asyncBridge2 = new AsyncBridge();
        rollupProcessor.setSupportedBridge(address(asyncBridge2), 1000000);
        asyncBridge2AddressId = rollupProcessor.getSupportedBridgesLength();
    }

    function testCanReenterProcessAsyncDefiInteractionFromRollup() public {
        // I verify that AsyncDefiBridgeProcessed and DefiBridgeProcessed events get emitted and that balances
        // are as expected

        uint256 nonceAsync = 0;
        uint256 nonceSync = 32;

        uint256 amountInAsync = 1 ether;
        uint256 amountInSync = 2 ether;

        // 1ST ROLLUP
        AsyncBridge.SubAction[] memory subActionsAsync = new AsyncBridge.SubAction[](1);
        subActionsAsync[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountInAsync / 2,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", nonceAsync)
        });

        asyncBridge1.setAction(
            AsyncBridge.Action({
                outputA: amountInAsync / 2,
                outputB: 0,
                interactionComplete: true,
                subs: subActionsAsync
            })
        );

        uint256 encodedBridgeCallDataAsync = rollupEncoder.defiInteractionL2(
            asyncBridge1AddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountInAsync
        );

        deal(address(rollupProcessor), amountInAsync);

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallDataAsync, 0, amountInAsync);
        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance after 1st rollup not matching");
        assertEq(address(asyncBridge1).balance, amountInAsync, "bridge eth balance after 1st rollup not matching");

        // 2ND ROLLUP
        SyncBridge.SubAction[] memory subActionsSync = new SyncBridge.SubAction[](2);
        subActionsSync[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature("processAsyncDefiInteraction(uint256)", nonceAsync)
        });
        subActionsSync[1] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountInSync / 2,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", nonceSync)
        });

        syncBridge.setAction(SyncBridge.Action({outputA: amountInSync / 2, outputB: 0, subs: subActionsSync}));

        uint256 encodedBridgeCallDataSync = rollupEncoder.defiInteractionL2(
            syncBridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountInSync
        );

        deal(address(rollupProcessor), amountInSync);

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallDataAsync, nonceAsync, amountInAsync, amountInAsync / 2, 0, true, bytes("")
        );
        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallDataSync, nonceSync, amountInSync, amountInSync / 2, 0, true, bytes("")
        );
        // All the ETH should get returned to the RollupProcessor in this run
        // _amountIn will get returned directly from execute() called in convert(...)
        // _amountInAsync will get returned from:
        //    syncBridge.convert() --> syncBridge.execute() --> processor.processAsyncDefiInteraction(0)
        //                         --> asyncBridge1.finalize()
        rollupEncoder.processRollup();

        assertEq(
            address(rollupProcessor).balance,
            (amountInSync + amountInAsync) / 2,
            "rollup eth balance after 2nd rollup not matching"
        );
        assertEq(
            address(asyncBridge1).balance, amountInAsync / 2, "async bridge eth balance after 2nd rollup not matching"
        );
        assertEq(address(syncBridge).balance, amountInSync / 2, "sync bridge eth balance after 2nd rollup not matching");
    }

    function testCanReenterProcessAsyncDefiInteractionFromAsyncDefiInteractionInsideRollup() public {
        uint256 nonce1 = 0;
        uint256 nonce2 = 1;
        uint256 nonce3 = 32;

        uint256 amountIn1 = 1 ether;
        uint256 amountIn2 = 2 ether;
        uint256 amountIn3 = 3 ether;

        // 1ST ROLLUP
        AsyncBridge.SubAction[] memory subActions1 = new AsyncBridge.SubAction[](1);
        subActions1[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountIn1 / 2,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", nonce1)
        });

        asyncBridge1.setAction(
            AsyncBridge.Action({outputA: amountIn1 / 2, outputB: 0, interactionComplete: true, subs: subActions1})
        );

        uint256 encodedBridgeCallData1 = rollupEncoder.defiInteractionL2(
            asyncBridge1AddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn1
        );

        AsyncBridge.SubAction[] memory subActions2 = new AsyncBridge.SubAction[](2);
        subActions2[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature("processAsyncDefiInteraction(uint256)", nonce1)
        });
        subActions2[1] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountIn2 / 2,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", nonce2)
        });

        asyncBridge2.setAction(
            AsyncBridge.Action({outputA: amountIn2 / 2, outputB: 0, interactionComplete: true, subs: subActions2})
        );
        uint256 encodedBridgeCallData2 = rollupEncoder.defiInteractionL2(
            asyncBridge2AddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn2
        );

        deal(address(rollupProcessor), amountIn1 + amountIn2);

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData1, 0, amountIn1);
        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData2, 1, amountIn2);
        rollupEncoder.processRollup();

        assertEq(address(asyncBridge1).balance, amountIn1, "asyncBridge1 eth balance after 1st rollup not matching");
        assertEq(address(asyncBridge2).balance, amountIn2, "asyncBridge2 eth balance after 1st rollup not matching");
        assertEq(address(rollupProcessor).balance, 0, "bridge eth balance after 1st rollup not matching");

        // 2ND ROLLUP
        // Now there are 2 async operations waiting to be finalized
        // Add 3rd async operation which will trigger finalization of operation with nonce2
        SyncBridge.SubAction[] memory subActions3 = new SyncBridge.SubAction[](2);
        subActions3[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature("processAsyncDefiInteraction(uint256)", nonce2)
        });
        subActions3[1] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountIn3 / 2,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", nonce3)
        });

        syncBridge.setAction(SyncBridge.Action({outputA: amountIn3 / 2, outputB: 0, subs: subActions3}));

        uint256 encodedBridgeCallData3 = rollupEncoder.defiInteractionL2(
            syncBridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn3
        );

        deal(address(rollupProcessor), amountIn3);
        // All the ETH should get returned to the RollupProcessor in second rollup
        // _amountIn3 gets returned first directly from syncBridge.convert() --> syncBridge.execute()
        // _amountIn2 gets returned second from:
        //      syncBridge.convert() --> syncBridge.execute() --> processor.processAsyncDefiInteraction(1)
        //                       --> asyncBridge2.finalize() --> asyncBridge2.execute()
        // _amountIn1 gets returned last from:
        //      syncBridge.convert() --> syncBridge.execute() --> processor.processAsyncDefiInteraction(1)
        //                       --> asyncBridge2.finalize() --> asyncBridge2.execute()
        //                       --> processor.processAsyncDefiInteraction(0) --> asyncBridge1.finalize()
        //                       --> asyncBridge1.execute()

        rollupEncoder.registerEventToBeChecked(encodedBridgeCallData1, nonce1, amountIn1, amountIn1 / 2, 0, true, "");
        rollupEncoder.registerEventToBeChecked(encodedBridgeCallData2, nonce2, amountIn2, amountIn2 / 2, 0, true, "");
        rollupEncoder.registerEventToBeChecked(encodedBridgeCallData3, nonce3, amountIn3, amountIn3 / 2, 0, true, "");
        rollupEncoder.processRollup();

        assertEq(
            address(rollupProcessor).balance,
            (amountIn1 + amountIn2 + amountIn3) / 2,
            "rollup eth balance after 2nd rollup not matching"
        );
    }

    function testRevertsWhenReenteringProcessRollupFromProcessAsyncDefiInteractionInsideRollup() public {
        uint256 nonce1 = 0;

        uint256 amountIn1 = 6;
        uint256 amountIn2 = 16;

        // 1ST ROLLUP
        AsyncBridge.SubAction[] memory subActions1 = new AsyncBridge.SubAction[](2);
        subActions1[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature("processRollup(bytes,bytes)", "", "")
        });
        subActions1[1] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountIn1 / 2,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", nonce1)
        });

        asyncBridge1.setAction(
            AsyncBridge.Action({outputA: amountIn2 / 2, outputB: 0, interactionComplete: true, subs: subActions1})
        );

        uint256 encodedBridgeCallData1 = rollupEncoder.defiInteractionL2(
            asyncBridge1AddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn1
        );

        deal(address(rollupProcessor), amountIn1);

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData1, nonce1, amountIn1);
        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance after 1st rollup not matching");
        assertEq(address(asyncBridge1).balance, amountIn1, "asyncBridge1 eth balance after 1st rollup not matching");

        // 2ND ROLLUP
        uint256 nonce2 = 32;

        SyncBridge.SubAction[] memory subActions2 = new SyncBridge.SubAction[](2);
        subActions2[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature("processAsyncDefiInteraction(uint256)", nonce1)
        });
        subActions2[1] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountIn2 / 2,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", nonce2)
        });

        syncBridge.setAction(SyncBridge.Action({outputA: amountIn2 / 2, outputB: 0, subs: subActions2}));

        uint256 encodedBridgeCallData2 = rollupEncoder.defiInteractionL2(
            syncBridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn2
        );

        deal(address(rollupProcessor), amountIn2);

        // Check that DefiBridgeProcessed event with error reason being the selector of LOCKED_NO_REENTER() error gets
        // emitted

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData2,
            nonce2,
            amountIn2,
            0,
            0,
            false,
            abi.encodePacked(RollupProcessorV2.LOCKED_NO_REENTER.selector)
        );
        rollupEncoder.processRollup();
    }

    function testShouldRevertWhenReenteringDepositFromRollup() public {
        uint256 amountIn1 = 6;

        SyncBridge.SubAction[] memory subActions1 = new SyncBridge.SubAction[](1);
        subActions1[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountIn1,
            data: abi.encodeWithSignature(
                "depositPendingFunds(uint256,uint256,address,bytes32)",
                0, // _assetId
                amountIn1, // _amount
                address(29), // _owner
                "" // _proofHash
            )
        });

        syncBridge.setAction(SyncBridge.Action({outputA: amountIn1 / 2, outputB: 0, subs: subActions1}));

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            syncBridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn1
        );

        deal(address(rollupProcessor), amountIn1);

        // Check that DefiBridgeProcessed event with error reason being the selector of LOCKED_NO_REENTER() error gets
        // emitted

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData,
            0,
            amountIn1,
            0,
            0,
            false,
            abi.encodePacked(RollupProcessorV2.LOCKED_NO_REENTER.selector)
        );
        rollupEncoder.processRollup();
    }

    function testShouldRevertWhenReenteringSetSupportedBridgeFromRollup() public {
        // Allow anyone to list --> we want the call to revert on reentry check, not on third party check
        rollupProcessor.setAllowThirdPartyContracts(true);

        uint256 amountIn1 = 6;

        SyncBridge.SubAction[] memory subActions1 = new SyncBridge.SubAction[](1);
        subActions1[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature(
                "setSupportedBridge(address,uint256)",
                address(29), // _bridge
                50000 // _gasLimit
            )
        });

        syncBridge.setAction(SyncBridge.Action({outputA: amountIn1 / 2, outputB: 0, subs: subActions1}));

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            syncBridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn1
        );

        deal(address(rollupProcessor), amountIn1);

        // Check that DefiBridgeProcessed event with error reason being the selector of LOCKED_NO_REENTER() error gets
        // emitted

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData,
            0,
            amountIn1,
            0,
            0,
            false,
            abi.encodePacked(RollupProcessorV2.LOCKED_NO_REENTER.selector)
        );
        rollupEncoder.processRollup();
    }

    function testShouldRevertWhenReenteringSetSupportedAssetFromRollup() public {
        // Allow anyone to list --> we want the call to revert on reentry check, not on third party check
        rollupProcessor.setAllowThirdPartyContracts(true);

        uint256 amountIn1 = 6;

        SyncBridge.SubAction[] memory subActions1 = new SyncBridge.SubAction[](1);
        subActions1[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature(
                "setSupportedAsset(address,uint256)",
                address(29), // _token
                50000 // _gasLimit
            )
        });

        syncBridge.setAction(SyncBridge.Action({outputA: amountIn1 / 2, outputB: 0, subs: subActions1}));

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            syncBridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn1
        );

        deal(address(rollupProcessor), amountIn1);

        // Check that DefiBridgeProcessed event with error reason being the selector of LOCKED_NO_REENTER() error gets
        // emitted

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData,
            0,
            amountIn1,
            0,
            0,
            false,
            abi.encodePacked(RollupProcessorV2.LOCKED_NO_REENTER.selector)
        );
        rollupEncoder.processRollup();
    }

    function testShouldRevertWhenReenteringProcessRollupFromRollup() public {
        uint256 amountIn1 = 6;

        SyncBridge.SubAction[] memory subActions1 = new SyncBridge.SubAction[](1);
        subActions1[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature("processRollup(bytes,bytes)", "", "")
        });

        syncBridge.setAction(SyncBridge.Action({outputA: amountIn1 / 2, outputB: 0, subs: subActions1}));

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            syncBridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn1
        );

        deal(address(rollupProcessor), amountIn1);

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData,
            0,
            amountIn1,
            0,
            0,
            false,
            abi.encodePacked(RollupProcessorV2.LOCKED_NO_REENTER.selector)
        );
        rollupEncoder.processRollup();
    }

    function testShouldRevertWhenReenteringDepositFromAsync() public {
        uint256 amountIn1 = 6;

        AsyncBridge.SubAction[] memory subActionsAsync = new AsyncBridge.SubAction[](1);
        subActionsAsync[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountIn1 / 2,
            data: abi.encodeWithSignature(
                "depositPendingFunds(uint256,uint256,address,bytes32)",
                0, // _assetId
                amountIn1, // _amount
                address(29), // _owner
                "" // _proofHash
            )
        });

        asyncBridge1.setAction(
            AsyncBridge.Action({outputA: amountIn1 / 2, outputB: 0, interactionComplete: true, subs: subActionsAsync})
        );

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            asyncBridge1AddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn1
        );

        deal(address(rollupProcessor), amountIn1);

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, 0, amountIn1);
        rollupEncoder.processRollup();

        vm.expectRevert(RollupProcessorV2.LOCKED_NO_REENTER.selector);
        rollupProcessor.processAsyncDefiInteraction(0);
    }

    function testShouldRevertWhenReenteringSetSupportedBridgeFromAsync() public {
        // Allow anyone to list --> we want the call to revert on reentry check, not on third party check
        rollupProcessor.setAllowThirdPartyContracts(true);

        uint256 amountIn1 = 6;

        AsyncBridge.SubAction[] memory subActionsAsync = new AsyncBridge.SubAction[](1);
        subActionsAsync[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature(
                "setSupportedBridge(address,uint256)",
                address(29), // _bridge
                50000 // _gasLimit
            )
        });

        asyncBridge1.setAction(
            AsyncBridge.Action({outputA: amountIn1 / 2, outputB: 0, interactionComplete: true, subs: subActionsAsync})
        );

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            asyncBridge1AddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn1
        );

        deal(address(rollupProcessor), amountIn1);

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, 0, amountIn1);
        rollupEncoder.processRollup();

        vm.expectRevert(RollupProcessorV2.LOCKED_NO_REENTER.selector);
        rollupProcessor.processAsyncDefiInteraction(0);
    }

    function testShouldRevertWhenReenteringSetSupportedAssetFromAsync() public {
        // Allow anyone to list --> we want the call to revert on reentry check, not on third party check
        rollupProcessor.setAllowThirdPartyContracts(true);

        uint256 amountIn1 = 6;

        AsyncBridge.SubAction[] memory subActionsAsync = new AsyncBridge.SubAction[](1);
        subActionsAsync[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature(
                "setSupportedAsset(address,uint256)",
                address(29), // _token
                50000 // _gasLimit
            )
        });

        asyncBridge1.setAction(
            AsyncBridge.Action({outputA: amountIn1 / 2, outputB: 0, interactionComplete: true, subs: subActionsAsync})
        );

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            asyncBridge1AddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn1
        );

        deal(address(rollupProcessor), amountIn1);

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, 0, amountIn1);
        rollupEncoder.processRollup();

        vm.expectRevert(RollupProcessorV2.LOCKED_NO_REENTER.selector);
        rollupProcessor.processAsyncDefiInteraction(0);
    }

    function testShouldRevertWhenReenteringProcessRollupFromAsync() public {
        uint256 amountIn1 = 6;

        AsyncBridge.SubAction[] memory subActionsAsync = new AsyncBridge.SubAction[](1);
        subActionsAsync[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature("processRollup(bytes,bytes)", "", "")
        });

        asyncBridge1.setAction(
            AsyncBridge.Action({outputA: amountIn1 / 2, outputB: 0, interactionComplete: true, subs: subActionsAsync})
        );

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            asyncBridge1AddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn1
        );

        deal(address(rollupProcessor), amountIn1);

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, 0, amountIn1);
        rollupEncoder.processRollup();

        vm.expectRevert(RollupProcessorV2.LOCKED_NO_REENTER.selector);
        rollupProcessor.processAsyncDefiInteraction(0);
    }

    function testShouldRevertWhenReenteringProcessRollupFromDeposit() public {
        ERC20Reenter reenterToken = new ERC20Reenter('ReenterToken');

        rollupProcessor.setSupportedAsset(address(reenterToken), 1000000);
        uint256 assetId = rollupProcessor.getSupportedAssetsLength();

        vm.expectRevert(RollupProcessorV2.LOCKED_NO_REENTER.selector);
        rollupProcessor.depositPendingFunds(assetId, 0, address(29), "");
    }

    function testShouldRevertWhenAsyncReenterTriesToExecuteSameInteractionTwice() public {
        uint256 amountIn = 6;

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](2);
        subActions[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: 0,
            data: abi.encodeWithSignature("processAsyncDefiInteraction(uint256)", 0)
        });
        subActions[1] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountIn / 2,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", 0)
        });

        asyncBridge1.setAction(
            AsyncBridge.Action({outputA: amountIn / 2, outputB: 0, interactionComplete: true, subs: subActions})
        );

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            asyncBridge1AddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn
        );

        deal(address(rollupProcessor), amountIn);

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, 0, amountIn);
        rollupEncoder.processRollup();

        vm.expectRevert(RollupProcessorV2.INVALID_BRIDGE_CALL_DATA.selector);
        rollupProcessor.processAsyncDefiInteraction(0);
    }

    function testThatFailingAsyncWillRevertAndNotSpendTheInteractionNonce() public {
        uint256 amountIn = 6;

        asyncBridge1.setAction(
            AsyncBridge.Action({
                outputA: amountIn / 2,
                outputB: 0,
                interactionComplete: false,
                subs: new AsyncBridge.SubAction[](0)
            })
        );

        deal(address(rollupProcessor), amountIn);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            asyncBridge1AddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, 0, amountIn);
        rollupEncoder.processRollup();

        // Check the async interaction is "waiting" in pending
        (uint256 encodedBridgeCallDataInPending,) = rollupProcessor.pendingDefiInteractions(0);
        assertEq(encodedBridgeCallDataInPending, encodedBridgeCallData, "bridgeCallData differs");

        // Try to process the interaction - it should not complete
        rollupProcessor.processAsyncDefiInteraction(0);

        // Verify the interaction was not processed by checking that it was not removed from pendingDefiInteractions
        (encodedBridgeCallDataInPending,) = rollupProcessor.pendingDefiInteractions(0);
        assertEq(
            encodedBridgeCallDataInPending, encodedBridgeCallData, "bridgeCallData after processing interaction differs"
        );

        // Now allow the bridge to finalize
        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](1);
        subActions[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountIn / 2,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", 0)
        });

        asyncBridge1.setAction(
            AsyncBridge.Action({outputA: amountIn / 2, outputB: 0, interactionComplete: true, subs: subActions})
        );

        rollupProcessor.processAsyncDefiInteraction(0);

        // Check the interaction was successfully processed by verifying it was removed from pendingDefiInteractions
        (encodedBridgeCallDataInPending,) = rollupProcessor.pendingDefiInteractions(0);
        assertEq(encodedBridgeCallDataInPending, 0, "interaction was not processed");
    }
}
