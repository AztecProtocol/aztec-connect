// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";

import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Mintable} from "../mocks/ERC20Mintable.sol";
import {SyncBridge} from "../mocks/SyncBridge.sol";
import {RollupManipulator} from "../mocks/RollupManipulator.sol";

contract DefiBridgeTest is TestBase {
    SyncBridge internal bridge;
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
        bridge = new SyncBridge();
        rollupProcessor.setSupportedBridge(address(bridge), 1000000);
        bridgeAddressId = rollupProcessor.getSupportedBridgesLength();

        // Support token A
        tokenA = new ERC20Mintable('Mintable');
        rollupProcessor.setSupportedAsset(address(tokenA), 100000);
        tokenAssetA = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenA),
            assetType: AztecTypes.AztecAssetType.ERC20
        });

        // Support token B
        tokenB = new ERC20Mintable('Mintable');
        rollupProcessor.setSupportedAsset(address(tokenB), 100000);
        tokenAssetB = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenB),
            assetType: AztecTypes.AztecAssetType.ERC20
        });

        // Setup eth asset
        ethAsset = AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.ETH});
    }

    function testTokenToEth(uint128 _amountIn, uint128 _amountOut) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: _amountOut,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", 0)
        });

        SyncBridge.Action memory action = SyncBridge.Action({outputA: _amountOut, outputB: 0, subs: subActions});

        bridge.setAction(action);
        vm.deal(address(bridge), _amountOut);
        tokenA.mint(address(rollupProcessor), amountIn);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, 0, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, _amountOut, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), 0, "rollup token balance not matching");

        assertEq(address(bridge).balance, 0, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), amountIn, "bridge token balance not matching");
    }

    function testEthToToken(uint128 _amountIn, uint128 _amountOut) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] = SyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _amountOut)
        });

        SyncBridge.Action memory action = SyncBridge.Action({outputA: _amountOut, outputB: 0, subs: subActions});

        bridge.setAction(action);
        vm.deal(address(rollupProcessor), amountIn);
        tokenA.mint(address(bridge), _amountOut);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, tokenAssetA, emptyAsset, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, 0, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), _amountOut, "rollup token balance not matching");

        assertEq(address(bridge).balance, amountIn, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), 0, "bridge token balance not matching");
    }

    function testTokenToToken(uint128 _amountIn, uint128 _amountOut) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] = SyncBridge.SubAction({
            target: address(tokenB),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _amountOut)
        });

        SyncBridge.Action memory action = SyncBridge.Action({outputA: _amountOut, outputB: 0, subs: subActions});

        bridge.setAction(action);
        tokenA.mint(address(rollupProcessor), amountIn);
        tokenB.mint(address(bridge), _amountOut);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, tokenAssetB, emptyAsset, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, 0, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(tokenA.balanceOf(address(rollupProcessor)), 0, "rollup token balance not matching");
        assertEq(tokenB.balanceOf(address(rollupProcessor)), _amountOut, "rollup token balance not matching");

        assertEq(tokenA.balanceOf(address(bridge)), amountIn, "bridge token balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), 0, "bridge token balance not matching");
    }

    function testTokenToVirtual(uint128 _amountIn, uint128 _amountOut) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] = SyncBridge.SubAction({
            target: address(tokenB),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _amountOut)
        });

        SyncBridge.Action memory action = SyncBridge.Action({outputA: _amountOut, outputB: 0, subs: subActions});

        bridge.setAction(action);
        tokenA.mint(address(rollupProcessor), amountIn);

        AztecTypes.AztecAsset memory virtualAsset =
            AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.VIRTUAL});

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, virtualAsset, emptyAsset, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, 0, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(tokenA.balanceOf(address(rollupProcessor)), 0, "rollup token balance not matching");
        assertEq(tokenB.balanceOf(address(rollupProcessor)), 0, "rollup token balance not matching");

        assertEq(tokenA.balanceOf(address(bridge)), amountIn, "bridge token balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), 0, "bridge token balance not matching");
    }

    function testJustBelowMaxDefiInteractionLength(uint128 _amountIn, uint128 _amountOut) public {
        /**
         * Process a defi interaction when the `defiInteractionHashes.length == MAX - 1`.
         */
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] = SyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _amountOut)
        });

        SyncBridge.Action memory action = SyncBridge.Action({outputA: _amountOut, outputB: 0, subs: subActions});

        bridge.setAction(action);
        vm.deal(address(rollupProcessor), amountIn);
        tokenA.mint(address(bridge), _amountOut);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, tokenAssetA, emptyAsset, uint64(0), amountIn
        );

        uint256 val = 1023;
        uint256 reducation = val >= 32 ? 32 : val;

        RollupManipulator manipulator = new RollupManipulator();
        manipulator.stubTransactionHashesLength(address(rollupProcessor), val);
        assertEq(rollupProcessor.getPendingDefiInteractionHashesLength(), val);

        rollupEncoder.setNextRollupId(1); // To not reset the size.

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, 0, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(rollupProcessor.getPendingDefiInteractionHashesLength(), val + 1 - reducation);

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), _amountOut, "rollup token balance not matching");

        assertEq(address(bridge).balance, amountIn, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), 0, "bridge token balance not matching");
    }

    function testMultipleDefiInteractions(uint128 _amountIn, uint128 _amountOut) public {
        SyncBridge bridge2 = new SyncBridge();
        rollupProcessor.setSupportedBridge(address(bridge2), 1000000);
        uint256 bridge2AddressId = rollupProcessor.getSupportedBridgesLength();

        uint256 amountIn = bound(_amountIn, 1, type(uint112).max);
        uint256 amountOut = bound(_amountOut, 1, type(uint112).max);

        {
            SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
            subActions[0] = SyncBridge.SubAction({
                target: address(tokenB),
                value: 0,
                data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), amountOut)
            });

            SyncBridge.Action memory action = SyncBridge.Action({outputA: amountOut, outputB: 0, subs: subActions});

            bridge.setAction(action);
            bridge2.setAction(action);
        }
        tokenA.mint(address(rollupProcessor), amountIn * 2);
        tokenB.mint(address(bridge), amountOut);
        tokenB.mint(address(bridge2), amountOut);

        rollupEncoder.registerEventToBeChecked(
            rollupEncoder.defiInteractionL2(
                bridgeAddressId, tokenAssetA, emptyAsset, tokenAssetB, emptyAsset, uint64(0), amountIn
            ),
            rollupEncoder.getNextNonce(),
            amountIn,
            amountOut,
            0,
            true,
            bytes("")
        );
        rollupEncoder.registerEventToBeChecked(
            rollupEncoder.defiInteractionL2(
                bridge2AddressId, tokenAssetA, emptyAsset, tokenAssetB, emptyAsset, uint64(0), amountIn
            ),
            rollupEncoder.getNextNonce() + 1,
            amountIn,
            amountOut,
            0,
            true,
            bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(tokenA.balanceOf(address(rollupProcessor)), 0, "rollup token A balance not matching");
        assertEq(tokenB.balanceOf(address(rollupProcessor)), amountOut * 2, "rollup token Bbalance not matching");

        assertEq(tokenA.balanceOf(address(bridge)), amountIn, "bridge token A balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), 0, "bridge token B balance not matching");

        assertEq(tokenA.balanceOf(address(bridge2)), amountIn, "bridge2 token A balance not matching");
        assertEq(tokenB.balanceOf(address(bridge2)), 0, "bridge2 token B balance not matching");
    }

    function testEthToTwoToken(uint128 _amountIn, uint128 _amountOut, uint128 _amount2Out) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](2);
        subActions[0] = SyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _amountOut)
        });
        subActions[1] = SyncBridge.SubAction({
            target: address(tokenB),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _amount2Out)
        });

        SyncBridge.Action memory action =
            SyncBridge.Action({outputA: _amountOut, outputB: _amount2Out, subs: subActions});

        bridge.setAction(action);
        vm.deal(address(rollupProcessor), amountIn);
        tokenA.mint(address(bridge), _amountOut);
        tokenB.mint(address(bridge), _amount2Out);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, tokenAssetA, tokenAssetB, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, _amount2Out, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), _amountOut, "rollup token A balance not matching");
        assertEq(tokenB.balanceOf(address(rollupProcessor)), _amount2Out, "rollup token B balance not matching");

        assertEq(address(bridge).balance, amountIn, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), 0, "bridge token A balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), 0, "bridge token B balance not matching");
    }

    function testTwoTokensToEth(uint128 _amountIn, uint128 _amountOut) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: _amountOut,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", 0)
        });

        SyncBridge.Action memory action = SyncBridge.Action({outputA: _amountOut, outputB: 0, subs: subActions});

        bridge.setAction(action);
        vm.deal(address(bridge), _amountOut);
        tokenA.mint(address(rollupProcessor), amountIn);
        tokenB.mint(address(rollupProcessor), amountIn);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, tokenAssetB, ethAsset, emptyAsset, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, 0, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, _amountOut, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), 0, "rollup token A balance not matching");
        assertEq(tokenB.balanceOf(address(rollupProcessor)), 0, "rollup token B balance not matching");

        assertEq(address(bridge).balance, 0, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), amountIn, "bridge token A balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), amountIn, "bridge token B balance not matching");
    }

    function testTwoInputToTwoOutputs(uint128 _amountIn, uint128 _amountOut, uint128 _amount2Out) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](2);
        subActions[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: _amountOut,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", 0)
        });
        subActions[1] = SyncBridge.SubAction({
            target: address(tokenB),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _amount2Out)
        });

        SyncBridge.Action memory action =
            SyncBridge.Action({outputA: _amountOut, outputB: _amount2Out, subs: subActions});

        bridge.setAction(action);
        vm.deal(address(bridge), _amountOut);

        tokenA.mint(address(rollupProcessor), amountIn);
        tokenB.mint(address(rollupProcessor), amountIn);
        tokenB.mint(address(bridge), _amount2Out);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, tokenAssetB, ethAsset, tokenAssetB, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, _amount2Out, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, _amountOut, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), 0, "rollup token A balance not matching");
        assertEq(tokenB.balanceOf(address(rollupProcessor)), _amount2Out, "rollup token B balance not matching");

        assertEq(address(bridge).balance, 0, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), amountIn, "bridge token A balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), amountIn, "bridge token B balance not matching");
    }

    function testTwoTokensToTwoVirtual(uint128 _amountIn, uint128 _amountOut, uint128 _amount2Out) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](0);

        SyncBridge.Action memory action =
            SyncBridge.Action({outputA: _amountOut, outputB: _amount2Out, subs: subActions});

        bridge.setAction(action);

        AztecTypes.AztecAsset memory virtualAssetPlaceHolder =
            AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.VIRTUAL});

        tokenA.mint(address(rollupProcessor), amountIn);
        tokenB.mint(address(rollupProcessor), amountIn);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId,
            tokenAssetA,
            tokenAssetB,
            virtualAssetPlaceHolder,
            virtualAssetPlaceHolder,
            uint64(0),
            amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, _amount2Out, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), 0, "rollup token A balance not matching");
        assertEq(tokenB.balanceOf(address(rollupProcessor)), 0, "rollup token B balance not matching");

        assertEq(address(bridge).balance, 0, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), amountIn, "bridge token A balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), amountIn, "bridge token B balance not matching");
    }

    function testTwoVirtualToTwoReal(uint128 _amountIn, uint128 _amountOut, uint128 _amount2Out) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](2);
        subActions[0] = SyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _amountOut)
        });
        subActions[1] = SyncBridge.SubAction({
            target: address(tokenB),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _amount2Out)
        });
        SyncBridge.Action memory action =
            SyncBridge.Action({outputA: _amountOut, outputB: _amount2Out, subs: subActions});

        bridge.setAction(action);

        AztecTypes.AztecAsset memory virtualAsset1 =
            AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.VIRTUAL});
        AztecTypes.AztecAsset memory virtualAsset2 =
            AztecTypes.AztecAsset({id: 2, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.VIRTUAL});

        tokenA.mint(address(bridge), _amountOut);
        tokenB.mint(address(bridge), _amount2Out);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, virtualAsset1, virtualAsset2, tokenAssetA, tokenAssetB, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, _amount2Out, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), _amountOut, "rollup token A balance not matching");
        assertEq(tokenB.balanceOf(address(rollupProcessor)), _amount2Out, "rollup token B balance not matching");

        assertEq(address(bridge).balance, 0, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), 0, "bridge token A balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), 0, "bridge token B balance not matching");
    }

    function testTwoVirtualToTwoVirtual(uint128 _amountIn, uint128 _amountOut, uint128 _amount2Out) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](0);

        SyncBridge.Action memory action =
            SyncBridge.Action({outputA: _amountOut, outputB: _amount2Out, subs: subActions});

        bridge.setAction(action);

        AztecTypes.AztecAsset memory virtualAssetA =
            AztecTypes.AztecAsset({id: 24, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.VIRTUAL});
        AztecTypes.AztecAsset memory virtualAssetB =
            AztecTypes.AztecAsset({id: 25, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.VIRTUAL});

        AztecTypes.AztecAsset memory virtualAssetPlaceHolder =
            AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.VIRTUAL});

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId,
            virtualAssetA,
            virtualAssetB,
            virtualAssetPlaceHolder,
            virtualAssetPlaceHolder,
            uint64(0),
            amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), amountIn, _amountOut, _amount2Out, true, bytes("")
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), 0, "rollup token A balance not matching");
        assertEq(tokenB.balanceOf(address(rollupProcessor)), 0, "rollup token B balance not matching");

        assertEq(address(bridge).balance, 0, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), 0, "bridge token A balance not matching");
        assertEq(tokenB.balanceOf(address(bridge)), 0, "bridge token B balance not matching");
    }

    function testDefiBridgeProcessedGetsEmittedInTheSameRollupWhenInteractionFails() public {
        uint256 totalInputValue = 1 ether;

        deal(address(rollupProcessor), totalInputValue);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] =
            SyncBridge.SubAction({target: address(bridge), value: 0, data: abi.encodeWithSignature("mockRevert()")});

        SyncBridge.Action memory action = SyncBridge.Action({outputA: 0, outputB: 0, subs: subActions});
        bridge.setAction(action);

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
            abi.encodePacked(SyncBridge.MockRevert.selector)
        );
        rollupEncoder.processRollup();

        assertEq(rollupProcessor.getDefiInteractionHashesLength(), 1, "Incorrect defiInteractionHashesLength");
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 0, "Non-zero asyncDefiInteractionHashesLength");
        bytes32 expectedDefiInteractionHash =
            rollupEncoder.computeDefiInteractionHash(encodedBridgeCallData, 0, totalInputValue, 0, 0, false);
        assertEq(
            rollupProcessor.defiInteractionHashes(0),
            expectedDefiInteractionHash,
            "incorrect rollupProcessor.defiInteractionHashes(0)"
        );
    }
}
