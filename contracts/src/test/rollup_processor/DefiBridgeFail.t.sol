// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";

import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Mintable} from "../mocks/ERC20Mintable.sol";
import {SyncBridge} from "../mocks/SyncBridge.sol";
import {RollupManipulator} from "../mocks/RollupManipulator.sol";

contract DefiBridgeFailTest is TestBase {
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

    function testRevertingDefiInteractionsAssets(uint128 _amountIn) public {
        AztecTypes.AztecAsset memory virtual1 =
            AztecTypes.AztecAsset({id: 1, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.VIRTUAL});

        AztecTypes.AztecAsset[] memory listA = new AztecTypes.AztecAsset[](4);
        listA[0] = emptyAsset;
        listA[1] = ethAsset;
        listA[2] = tokenAssetA;
        listA[3] = virtual1;

        for (uint256 i = 0; i < listA.length; i++) {
            for (uint256 j = 0; j < listA.length; j++) {
                for (uint256 k = 0; k < listA.length; k++) {
                    for (uint256 l = 0; l < listA.length; l++) {
                        if (i > 0 && j > 0 && i != k && j != l) {
                            _testRevertingDefiInteraction(listA[i], listA[k], listA[j], listA[l], _amountIn);
                        }
                    }
                }
            }
        }
    }

    function testWrongDefiInteractionHash() public {
        rollupEncoder.defiInteractionL2(bridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), 1);

        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();
        bytes32 hash = keccak256("empty");

        assembly {
            mstore(add(add(encodedProofData, 0x20), mul(0x20, 139)), hash)
        }

        bytes32 prev = rollupProcessor.prevDefiInteractionsHash();
        vm.expectRevert(
            abi.encodeWithSelector(RollupProcessorV2.INCORRECT_PREVIOUS_DEFI_INTERACTION_HASH.selector, hash, prev)
        );
        vm.prank(address(ROLLUP_PROVIDER));
        rollupProcessor.processRollup(encodedProofData, signatures);
    }

    function testZeroValueInput() public {
        rollupEncoder.defiInteractionL2(bridgeAddressId, tokenAssetA, emptyAsset, ethAsset, emptyAsset, uint64(0), 0);
        rollupEncoder.processRollupFail(RollupProcessorV2.ZERO_TOTAL_INPUT_VALUE.selector);
    }

    function testDefiInteractionHashLength(uint128 _amountIn, uint128 _amountOut) public {
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

        rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, tokenAssetA, emptyAsset, uint64(0), amountIn
        );

        uint256 val = 1023;
        RollupManipulator manipulator = new RollupManipulator();
        manipulator.stubTransactionHashesLength(address(rollupProcessor), val);
        assertEq(rollupProcessor.getDefiInteractionHashesLength(), val);
        manipulator.stubAsyncTransactionHashesLength(address(rollupProcessor), 32);
        assertEq(rollupProcessor.getAsyncDefiInteractionHashesLength(), 32);

        rollupEncoder.setNextRollupId(1); // To not reset the size.
        rollupEncoder.processRollupFail(RollupProcessorV2.ARRAY_OVERFLOW.selector);
    }

    function testInsufficientEthOutput() public {
        SyncBridge.Action memory action;
        action.outputA = 1 ether;
        bridge.setAction(action);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, ethAsset, emptyAsset, uint64(0), 1 ether
        );
        tokenA.mint(address(rollupProcessor), 1 ether);

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData,
            rollupEncoder.getNextNonce(),
            1 ether,
            0,
            0,
            false,
            abi.encodePacked(RollupProcessorV2.INSUFFICIENT_ETH_PAYMENT.selector)
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), 1 ether, "rollup token balance not matching");

        assertEq(address(bridge).balance, 0, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), 0, "bridge token balance not matching");
    }

    function testOutputAMoreThan252Bits() public {
        uint256 amountIn = 1;
        uint256 amountOut = 2 ** 252;

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountOut,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", 0)
        });

        SyncBridge.Action memory action = SyncBridge.Action({outputA: amountOut, outputB: 0, subs: subActions});

        bridge.setAction(action);
        vm.deal(address(bridge), amountOut);
        tokenA.mint(address(rollupProcessor), amountIn);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData,
            rollupEncoder.getNextNonce(),
            amountIn,
            0,
            0,
            false,
            abi.encodeWithSignature("OUTPUT_A_EXCEEDS_252_BITS(uint256)", amountOut)
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), amountIn, "rollup token balance not matching");

        assertEq(address(bridge).balance, amountOut, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), 0, "bridge token balance not matching");
    }

    function testOutputBMoreThan252Bits() public {
        uint256 amountIn = 1;
        uint256 amountOut = 2 ** 252;

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: amountOut,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", 0)
        });

        SyncBridge.Action memory action = SyncBridge.Action({outputA: 0, outputB: amountOut, subs: subActions});

        bridge.setAction(action);
        vm.deal(address(bridge), amountOut);
        tokenA.mint(address(rollupProcessor), amountIn);

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, ethAsset, emptyAsset, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData,
            rollupEncoder.getNextNonce(),
            amountIn,
            0,
            0,
            false,
            abi.encodeWithSignature("OUTPUT_B_EXCEEDS_252_BITS(uint256)", amountOut)
        );

        rollupEncoder.processRollup();

        assertEq(address(rollupProcessor).balance, 0, "rollup eth balance not matching");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), amountIn, "rollup token balance not matching");

        assertEq(address(bridge).balance, amountOut, "bridge eth balance not matching");
        assertEq(tokenA.balanceOf(address(bridge)), 0, "bridge token balance not matching");
    }

    function _testRevertingDefiInteraction(
        AztecTypes.AztecAsset memory _inputAssetA,
        AztecTypes.AztecAsset memory _inputAssetB,
        AztecTypes.AztecAsset memory _outputAssetA,
        AztecTypes.AztecAsset memory _outputAssetB,
        uint128 _amountIn
    ) public {
        uint256 amountIn = bound(_amountIn, 1, type(uint128).max);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] =
            SyncBridge.SubAction({target: address(bridge), value: 0, data: abi.encodeWithSignature("mockRevert()")});

        SyncBridge.Action memory action = SyncBridge.Action({outputA: 0, outputB: 0, subs: subActions});
        bridge.setAction(action);

        if (_inputAssetA.assetType == AztecTypes.AztecAssetType.ETH) {
            vm.deal(address(rollupProcessor), amountIn);
        } else if (_inputAssetA.assetType == AztecTypes.AztecAssetType.ERC20) {
            ERC20Mintable(_inputAssetA.erc20Address).mint(address(rollupProcessor), amountIn);
        }

        if (_inputAssetB.assetType == AztecTypes.AztecAssetType.ETH) {
            vm.deal(address(rollupProcessor), amountIn);
        } else if (_inputAssetB.assetType == AztecTypes.AztecAssetType.ERC20) {
            ERC20Mintable(_inputAssetB.erc20Address).mint(address(rollupProcessor), amountIn);
        }

        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, _inputAssetA, _inputAssetB, _outputAssetA, _outputAssetB, uint64(0), amountIn
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData,
            rollupEncoder.getNextNonce(),
            amountIn,
            0,
            0,
            false,
            abi.encodePacked(SyncBridge.MockRevert.selector)
        );

        rollupEncoder.processRollup();

        if (_inputAssetA.assetType == AztecTypes.AztecAssetType.ETH) {
            assertEq(address(rollupProcessor).balance, amountIn, "rollup eth balance not matching");
            vm.deal(address(rollupProcessor), 0);
        } else if (_inputAssetA.assetType == AztecTypes.AztecAssetType.ERC20) {
            assertEq(
                ERC20Mintable(_inputAssetA.erc20Address).balanceOf(address(rollupProcessor)),
                amountIn,
                "rollup token balance not matching"
            );
            deal(_inputAssetA.erc20Address, address(rollupProcessor), 0);
        }

        if (_inputAssetB.assetType == AztecTypes.AztecAssetType.ETH) {
            assertEq(address(rollupProcessor).balance, amountIn, "rollup eth balance not matching");
            vm.deal(address(rollupProcessor), 0);
        } else if (_inputAssetB.assetType == AztecTypes.AztecAssetType.ERC20) {
            assertEq(
                ERC20Mintable(_inputAssetB.erc20Address).balanceOf(address(rollupProcessor)),
                amountIn,
                "rollup token B balance not matching"
            );

            deal(_inputAssetB.erc20Address, address(rollupProcessor), 0);
        }
    }
}
