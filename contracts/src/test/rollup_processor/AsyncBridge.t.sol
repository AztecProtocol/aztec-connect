// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {DefiBridgeProxy} from "core/DefiBridgeProxy.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Mintable} from "../mocks/ERC20Mintable.sol";
import {AsyncBridge} from "../mocks/AsyncBridge.sol";
import {RollupManipulator} from "../mocks/RollupManipulator.sol";

contract AsyncBridgeTest is TestBase {
    uint256 internal constant MAX_NUM_ASYNC_DEFI_INTERACTION_HASHES = 512;

    AsyncBridge internal bridge;
    ERC20Mintable internal tokenA;
    ERC20Mintable internal tokenB;

    uint256 internal bridgeAddressId;

    AztecTypes.AztecAsset internal tokenAssetA;
    AztecTypes.AztecAsset internal tokenAssetB;
    AztecTypes.AztecAsset internal emptyAsset;
    AztecTypes.AztecAsset internal ethAsset;

    function setUp() public override {
        super.setUp();
        rollupProcessor.grantRole(rollupProcessor.LISTER_ROLE(), address(this));

        // Support the bridge with a large gas amount
        bridge = new AsyncBridge();
        rollupProcessor.setSupportedBridge(address(bridge), 1000000);
        bridgeAddressId = rollupProcessor.getSupportedBridgesLength();

        // List token A
        tokenA = new ERC20Mintable('TokenA');
        rollupProcessor.setSupportedAsset(address(tokenA), 100000);
        tokenAssetA = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenA),
            assetType: AztecTypes.AztecAssetType.ERC20
        });
        vm.label(address(tokenA), tokenA.name());

        // List token B
        tokenB = new ERC20Mintable('TokenB');
        rollupProcessor.setSupportedAsset(address(tokenB), 100000);
        tokenAssetB = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenB),
            assetType: AztecTypes.AztecAssetType.ERC20
        });
        vm.label(address(tokenB), tokenB.name());

        // Setup eth asset
        ethAsset = AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.ETH});
    }

    function testProcessInteractionWithTwoOutputAssets(
        uint128 _totalInputValue,
        uint128 _outputValueA,
        uint128 _outputValueB
    ) public {
        uint256 totalInputValue = bound(_totalInputValue, 1, type(uint128).max);
        uint256 outputValueA = bound(_outputValueA, 1, totalInputValue);
        uint256 outputValueB = bound(_outputValueB, 1, totalInputValue);

        uint256 interactionNonce = 0;

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](2);
        subActions[0] = AsyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), outputValueA)
        });
        subActions[1] = AsyncBridge.SubAction({
            target: address(tokenB),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), outputValueB)
        });

        AsyncBridge.Action memory action = AsyncBridge.Action({
            outputA: outputValueA,
            outputB: outputValueB,
            interactionComplete: true,
            subs: subActions
        });

        bridge.setAction(action);
        tokenA.mint(address(rollupProcessor), totalInputValue);
        tokenB.mint(address(rollupProcessor), totalInputValue);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, tokenAssetB, tokenAssetA, tokenAssetB, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue);
        rollupEncoder.processRollup();

        assertEq(tokenA.balanceOf(address(bridge)), totalInputValue, "bridge token A balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), totalInputValue, "bridge token B balance not matching");

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "non-zero interactions array length");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 0, "non-zero async interactions array length");

        vm.expectEmit(true, true, false, true);
        emit DefiBridgeProcessed(
            encodedBridgeCallData, interactionNonce, totalInputValue, outputValueA, outputValueB, true, ""
            );
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);

        assertEq(
            tokenA.balanceOf(address(bridge)),
            totalInputValue - outputValueA,
            "bridge token A balance not matching after interaction is processed"
        );
        assertEq(
            tokenB.balanceOf(address(bridge)),
            totalInputValue - outputValueB,
            "bridge token B balance not matching after interaction is processed"
        );
        assertEq(
            tokenA.balanceOf(address(rollupProcessor)),
            outputValueA,
            "rollup processor token A balance not matching after interaction is processed"
        );
        assertEq(
            tokenB.balanceOf(address(rollupProcessor)),
            outputValueB,
            "rollup processor token B balance not matching after interaction is processed"
        );

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "Non-zero defiInteractionHashesLength");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 1, "Incorrect asyncDefiInteractionHashesLength");

        bytes32 expectedDefiInteractionHash = rollupEncoder.computeDefiInteractionHash(
            encodedBridgeCallData, interactionNonce, totalInputValue, outputValueA, outputValueB, true
        );
        assertEq(
            rollupProcessor.asyncDefiInteractionHashes(0),
            expectedDefiInteractionHash,
            "incorrect rollupProcessor.asyncDefiInteractionHashes(0)"
        );

        // Process rollup and check that defiInteractionHash was moved from asyncDefiInteractionHashes to defiInteractionHashes
        _fillRollup();
        rollupEncoder.processRollup();

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 1, "Incorrect defiInteractionHashesLength");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 0, "Non-zero asyncDefiInteractionHashesLength");
        assertEq(
            rollupProcessor.defiInteractionHashes(0),
            expectedDefiInteractionHash,
            "incorrect rollupProcessor.defiInteractionHashes(0)"
        );
    }

    function testProcessAsyncDefiInteractionRevertsIfTransferOfOutputTokenFails() public {
        uint256 totalInputValue = 1 ether;
        uint256 interactionNonce = 0;

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](0);
        AsyncBridge.Action memory action =
            AsyncBridge.Action({outputA: totalInputValue / 2, outputB: 0, interactionComplete: true, subs: subActions});

        bridge.setAction(action);
        tokenA.mint(address(rollupProcessor), totalInputValue);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, tokenAssetA, emptyAsset, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue);
        rollupEncoder.processRollup();

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "Non-zero defiInteractionHashesLength");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 0, "Non-zero asyncDefiInteractionHashesLength");

        vm.expectRevert("TokenA: insufficient allowance");
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);
    }

    function testProcessAsyncDefiInteractionRevertsIfRefundOfInputTokenFails() public {
        uint256 totalInputValue = 1 ether;
        uint256 interactionNonce = 0;

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](0);
        AsyncBridge.Action memory action =
            AsyncBridge.Action({outputA: 0, outputB: 0, interactionComplete: true, subs: subActions});

        bridge.setAction(action);
        tokenA.mint(address(rollupProcessor), totalInputValue);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, tokenAssetB, emptyAsset, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue);
        rollupEncoder.processRollup();

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "Non-zero defiInteractionHashesLength");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 0, "Non-zero asyncDefiInteractionHashesLength");

        vm.expectRevert("TokenA: insufficient allowance");
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);
    }

    function testProcessAsyncDefiInteractionRevertsIfInsufficientAmountOfEthGetsTransferred() public {
        uint256 totalInputValue = 1 ether;

        uint256 interactionNonce = 0;

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](0);
        AsyncBridge.Action memory action =
            AsyncBridge.Action({outputA: totalInputValue / 2, outputB: 0, interactionComplete: true, subs: subActions});

        bridge.setAction(action);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), totalInputValue
        );

        deal(address(rollupProcessor), totalInputValue);

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue);
        rollupEncoder.processRollup();

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "Non-zero defiInteractionHashesLength");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 0, "Non-zero asyncDefiInteractionHashesLength");

        vm.expectRevert(RollupProcessorV2.INSUFFICIENT_ETH_PAYMENT.selector);
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);
    }

    function testAsyncInteractionFailsWhenAnyOfOutputValuesIsNot0(uint256 _outputValueA, uint256 _outputValueB)
        public
    {
        vm.assume(_outputValueA > 0 || _outputValueB > 0);
        bridge.setOutputValuesReturnedFromConvert(_outputValueA, _outputValueB);

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](0);
        AsyncBridge.Action memory action =
            AsyncBridge.Action({outputA: 1, outputB: 2, interactionComplete: true, subs: subActions});

        bridge.setAction(action);

        uint256 totalInputValue = 1 ether;
        deal(address(rollupProcessor), totalInputValue);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), totalInputValue
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData,
            rollupEncoder.getNextNonce(),
            totalInputValue,
            0,
            0,
            false,
            abi.encodeWithSelector(DefiBridgeProxy.ASYNC_NONZERO_OUTPUT_VALUES.selector, _outputValueA, _outputValueB)
        );
        rollupEncoder.processRollup();
    }

    function testProcessAsyncDefiInteractionRevertsIfNonZeroOutputValueBIsReturnedWhenOnlyOneOutputAssetIsExpected()
        public
    {
        uint256 totalInputValue = 1e18;
        uint256 outputValueA = 5e17;
        uint256 outputValueB = 8e17;
        uint256 interactionNonce = 0;

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](2);
        subActions[0] = AsyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), outputValueA)
        });
        subActions[1] = AsyncBridge.SubAction({
            target: address(tokenB),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), outputValueB)
        });

        AsyncBridge.Action memory action = AsyncBridge.Action({
            outputA: outputValueA,
            outputB: outputValueB,
            interactionComplete: true,
            subs: subActions
        });

        bridge.setAction(action);
        tokenA.mint(address(rollupProcessor), totalInputValue);
        tokenB.mint(address(rollupProcessor), totalInputValue);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, tokenAssetB, tokenAssetA, emptyAsset, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue);
        rollupEncoder.processRollup();

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "Non-zero defiInteractionHashesLength");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 0, "Non-zero asyncDefiInteractionHashesLength");

        vm.expectRevert(
            abi.encodeWithSelector(RollupProcessorV2.NONZERO_OUTPUT_VALUE_ON_NOT_USED_ASSET.selector, outputValueB)
        );
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);
    }

    function testInputTokenIsRefundedBackToProcessorIfFinaliseReturnsNoTokens() public {
        uint256 totalInputValue = 1e18;
        uint256 interactionNonce = 0;

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](1);
        subActions[0] = AsyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), totalInputValue)
        });

        AsyncBridge.Action memory action =
            AsyncBridge.Action({outputA: 0, outputB: 0, interactionComplete: true, subs: subActions});

        bridge.setAction(action);
        tokenA.mint(address(rollupProcessor), totalInputValue);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, tokenAssetB, emptyAsset, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue);
        rollupEncoder.processRollup();

        assertEq(
            tokenA.balanceOf(address(rollupProcessor)),
            0,
            "non-zero processor token A balance after rollup is processed"
        );

        assertEq(tokenA.balanceOf(address(bridge)), totalInputValue, "bridge token A balance not matching");

        vm.expectEmit(true, true, false, true);
        emit DefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue, 0, 0, false, "");
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);

        assertEq(
            tokenA.balanceOf(address(rollupProcessor)), totalInputValue, "token A was not refunded back to processor"
        );

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "Non-zero defiInteractionHashesLength");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 1, "Incorrect asyncDefiInteractionHashesLength");

        bytes32 expectedDefiInteractionHash = rollupEncoder.computeDefiInteractionHash(
            encodedBridgeCallData, interactionNonce, totalInputValue, 0, 0, false
        );
        assertEq(
            rollupProcessor.asyncDefiInteractionHashes(0),
            expectedDefiInteractionHash,
            "incorrect rollupProcessor.asyncDefiInteractionHashes(0)"
        );
    }

    function testInputTokensAreRefundedBackToProcessorIfFinaliseReturnsNoTokens() public {
        uint256 totalInputValue = 1e18;
        uint256 interactionNonce = 0;

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](2);
        subActions[0] = AsyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), totalInputValue)
        });
        subActions[1] = AsyncBridge.SubAction({
            target: address(tokenB),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), totalInputValue)
        });

        AsyncBridge.Action memory action =
            AsyncBridge.Action({outputA: 0, outputB: 0, interactionComplete: true, subs: subActions});

        bridge.setAction(action);
        tokenA.mint(address(rollupProcessor), totalInputValue);
        tokenB.mint(address(rollupProcessor), totalInputValue);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, tokenAssetB, ethAsset, emptyAsset, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue);
        rollupEncoder.processRollup();

        assertEq(
            tokenA.balanceOf(address(rollupProcessor)),
            0,
            "non-zero processor token A balance after rollup is processed"
        );
        assertEq(
            tokenB.balanceOf(address(rollupProcessor)),
            0,
            "non-zero processor token B balance after rollup is processed"
        );

        assertEq(tokenA.balanceOf(address(bridge)), totalInputValue, "bridge token A balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), totalInputValue, "bridge token B balance not matching");

        vm.expectEmit(true, true, false, true);
        emit DefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue, 0, 0, false, "");
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);

        assertEq(
            tokenA.balanceOf(address(rollupProcessor)), totalInputValue, "token A was not refunded back to processor"
        );
        assertEq(
            tokenB.balanceOf(address(rollupProcessor)), totalInputValue, "token B was not refunded back to processor"
        );

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "Non-zero defiInteractionHashesLength");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 1, "Incorrect asyncDefiInteractionHashesLength");

        bytes32 expectedDefiInteractionHash = rollupEncoder.computeDefiInteractionHash(
            encodedBridgeCallData, interactionNonce, totalInputValue, 0, 0, false
        );
        assertEq(
            rollupProcessor.asyncDefiInteractionHashes(0),
            expectedDefiInteractionHash,
            "incorrect rollupProcessor.asyncDefiInteractionHashes(0)"
        );
    }

    function testProcessAsyncDefiInteractionDoesNotRevertIfBothOutputValuesAre0ButBridgeFullyRefundsInputEth() public {
        uint256 totalInputValue = 1e18;
        uint256 interactionNonce = 0;

        deal(address(rollupProcessor), totalInputValue);

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](1);
        subActions[0] = AsyncBridge.SubAction({
            target: address(rollupProcessor),
            value: totalInputValue,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", interactionNonce)
        });

        AsyncBridge.Action memory action =
            AsyncBridge.Action({outputA: 0, outputB: 0, interactionComplete: true, subs: subActions});

        bridge.setAction(action);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, tokenAssetA, emptyAsset, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue);
        rollupEncoder.processRollup();

        vm.expectEmit(true, true, false, true);
        emit DefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue, 0, 0, false, "");
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);

        assertEq(address(rollupProcessor).balance, totalInputValue, "ETH was not refunded back to processor");

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "Non-zero defiInteractionHashesLength");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 1, "Incorrect asyncDefiInteractionHashesLength");

        bytes32 expectedDefiInteractionHash = rollupEncoder.computeDefiInteractionHash(
            encodedBridgeCallData, interactionNonce, totalInputValue, 0, 0, false
        );
        assertEq(
            rollupProcessor.asyncDefiInteractionHashes(0),
            expectedDefiInteractionHash,
            "incorrect rollupProcessor.asyncDefiInteractionHashes(0)"
        );
    }

    function testProcessAsyncDefiInteractionRevertsIfOutputAmountsAre0AndInputEthDoesntGetRefundedByTheBridge(
        uint128 _totalInputValue
    ) public {
        vm.assume(_totalInputValue > 0);
        uint256 interactionNonce = 0;
        deal(address(rollupProcessor), _totalInputValue);

        bridge.setAction(
            AsyncBridge.Action({outputA: 0, outputB: 0, interactionComplete: true, subs: new AsyncBridge.SubAction[](0)})
        );

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), _totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, _totalInputValue);
        rollupEncoder.processRollup();

        assertEq(
            address(bridge).balance,
            _totalInputValue,
            "Incorrect ETH balance of the bridge after the rollup is processed"
        );

        vm.expectRevert(RollupProcessorV2.INSUFFICIENT_ETH_PAYMENT.selector);
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);
    }

    function testCannotProcessTheSameAsyncInteractionTwice() public {
        uint256 totalInputValue = 1e18;
        uint256 outputValueA = 5e17;
        uint256 interactionNonce = 0;

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](1);
        subActions[0] = AsyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), outputValueA)
        });

        AsyncBridge.Action memory action =
            AsyncBridge.Action({outputA: outputValueA, outputB: 0, interactionComplete: true, subs: subActions});

        bridge.setAction(action);
        tokenA.mint(address(rollupProcessor), totalInputValue);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, tokenAssetA, emptyAsset, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue);
        rollupEncoder.processRollup();

        assertEq(tokenA.balanceOf(address(bridge)), totalInputValue, "bridge token A balance not matching");

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "non-zero interactions array length");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 0, "non-zero async interactions array length");

        vm.expectEmit(true, true, false, true);
        emit DefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue, outputValueA, 0, true, "");
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);

        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 1, "incorrect async interactions array length");

        // The interaction should no longer be in the pendingDefiInteractions mapping which will result in processor
        // loading 0 bridge call data
        vm.expectRevert(RollupProcessorV2.INVALID_BRIDGE_CALL_DATA.selector);
        rollupProcessor.processAsyncDefiInteraction(interactionNonce);
    }

    function testCannotProcessAnUnknownInteraction() public {
        // The interaction with interaction nonce 1 doesn't exist and can't be found in the pendingDefiInteractions
        // mapping which will result in processor loading 0 bridge call data
        vm.expectRevert(RollupProcessorV2.INVALID_BRIDGE_CALL_DATA.selector);
        rollupProcessor.processAsyncDefiInteraction(1);
    }

    function testWillFinaliseWhenNumAsyncDefiInteractionHashesIsMaxMinus1() public {
        _sendRollupWithInteraction();

        RollupManipulator manipulator = new RollupManipulator();
        manipulator.stubAsyncTransactionHashesLength(
            address(rollupProcessor), MAX_NUM_ASYNC_DEFI_INTERACTION_HASHES - 1
        );
        rollupProcessor.processAsyncDefiInteraction(0);

        assertEq(
            rollupProcessor.getAsyncDefiInteractionHashesLength(),
            MAX_NUM_ASYNC_DEFI_INTERACTION_HASHES,
            "incorrect num async interactions"
        );
    }

    function testWillFailToFinaliseWhenNumAsyncDefiInteractionHashesIsMax() public {
        _sendRollupWithInteraction();

        RollupManipulator manipulator = new RollupManipulator();
        manipulator.stubAsyncTransactionHashesLength(address(rollupProcessor), MAX_NUM_ASYNC_DEFI_INTERACTION_HASHES);

        vm.expectRevert(RollupProcessorV2.ARRAY_OVERFLOW.selector);
        rollupProcessor.processAsyncDefiInteraction(0);
    }

    /**
     * @notice A function which creates a deposit in order for the rollup to not be empty
     * @dev If the rollup was empty RollupProcessor.processRollup(...) would revert
     */
    function _fillRollup() private {
        uint256 assetId = 0; // ETH
        uint256 depositAmount = 1 ether;
        uint256 privKey = 0x676fa108d25db313eedc050f53eeedf8be73faa59bd405ecaa6a274fa3dfc101;
        address depositor = 0x96EA9a0C5010Dae807A279597080aa0dB1EeB10C;

        vm.deal(depositor, depositAmount);

        vm.prank(depositor);
        rollupProcessor.depositPendingFunds{value: depositAmount}(assetId, depositAmount, depositor, "");

        uint256 fee = 5e16;
        rollupEncoder.depositL2(assetId, depositAmount - fee, fee, privKey);
    }

    /**
     * @notice A function which submits an example interaction
     * @dev Expected to be used in tests where the content of the interaction doesn't matter
     */
    function _sendRollupWithInteraction() private {
        uint256 totalInputValue = 1e18;
        uint256 outputValueA = 5e17;
        uint256 interactionNonce = 0;

        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](1);
        subActions[0] = AsyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), outputValueA)
        });

        AsyncBridge.Action memory action =
            AsyncBridge.Action({outputA: outputValueA, outputB: 0, interactionComplete: true, subs: subActions});

        bridge.setAction(action);
        tokenA.mint(address(rollupProcessor), totalInputValue);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, tokenAssetA, emptyAsset, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit AsyncDefiBridgeProcessed(encodedBridgeCallData, interactionNonce, totalInputValue);
        rollupEncoder.processRollup();

        assertEq(tokenA.balanceOf(address(bridge)), totalInputValue, "bridge token A balance not matching");
        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "non-zero interactions array length");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 0, "non-zero async interactions array length");
    }
}
