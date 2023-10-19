// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Mintable} from "../mocks/ERC20Mintable.sol";
import {SyncBridge} from "../mocks/SyncBridge.sol";
import {AsyncBridge} from "../mocks/AsyncBridge.sol";
import {RollupManipulator} from "../mocks/RollupManipulator.sol";

contract InteractionNotesTest is TestBase {
    uint256 private constant NUMBER_OF_BRIDGE_CALLS = 32; // max number of bridge calls in a block
    uint256 private constant TOTAL_NUM_SYNC_BRIDGE_CALLS = 2;
    uint256 private constant TOTAL_NUM_ASYNC_BRIDGE_CALLS = 40;

    SyncBridge internal syncBridge;
    AsyncBridge internal asyncBridge;

    ERC20Mintable internal tokenA;
    ERC20Mintable internal tokenB;
    ERC20Mintable internal tokenC;

    uint256 internal syncBridgeAddressId;
    uint256 internal asyncBridgeAddressId;

    AztecTypes.AztecAsset internal tokenAssetA;
    AztecTypes.AztecAsset internal tokenAssetB;
    AztecTypes.AztecAsset internal tokenAssetC;
    AztecTypes.AztecAsset internal emptyAsset;
    AztecTypes.AztecAsset internal ethAsset;

    // Here to receive tx fee without revert in log --> address(this) is beneficieary
    receive() external payable {}

    function setUp() public override {
        super.setUp();
        rollupProcessor.grantRole(rollupProcessor.LISTER_ROLE(), address(this));

        // Setup the bridges
        syncBridge = new SyncBridge();
        rollupProcessor.setSupportedBridge(address(syncBridge), 1000000);
        syncBridgeAddressId = rollupProcessor.getSupportedBridgesLength();

        asyncBridge = new AsyncBridge();
        rollupProcessor.setSupportedBridge(address(asyncBridge), 1000000);
        asyncBridgeAddressId = rollupProcessor.getSupportedBridgesLength();

        // Setup token A
        tokenA = new ERC20Mintable("TokenA");
        rollupProcessor.setSupportedAsset(address(tokenA), 100000);
        tokenAssetA = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenA),
            assetType: AztecTypes.AztecAssetType.ERC20
        });

        // Setup token B
        tokenB = new ERC20Mintable("TokenB");
        rollupProcessor.setSupportedAsset(address(tokenB), 100000);
        tokenAssetB = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenB),
            assetType: AztecTypes.AztecAssetType.ERC20
        });

        // Setup token C
        tokenC = new ERC20Mintable("TokenC");
        rollupProcessor.setSupportedAsset(address(tokenC), 100000);
        tokenAssetC = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenC),
            assetType: AztecTypes.AztecAssetType.ERC20
        });

        // Setup eth asset
        ethAsset = AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.ETH});

        // Setup labels
        vm.label(address(tokenA), tokenA.name());
        vm.label(address(tokenB), tokenB.name());
        vm.label(address(tokenC), tokenC.name());
    }

    /*
     * @dev The test does the following:
     *          1) Sends 40 async interactions in 2 batches,
     *          2) finalize 35 of those,
     *          3) sends a batch with 1 sync interaction,
     *          4) finalizes the remaining 5 async interactions,
     *          5) sends a batch with 1 sync interaction.
     * @dev In the test I am mostly just checking the `AsyncDefiBridgeProcessed`, `DefiBridgeProcessed`
     *      and `RollupProcessed` events. These events contain a lot of information so just checking those should
     *      be enough.
     */
    function testNotesAreAsExpected(
        uint256 _totalInputValueSync,
        uint256 _totalInputValueAsync,
        uint256 _outputValueASync,
        uint256 _outputValueAAsync,
        uint256 _outputValueBAsync
    ) public {
        uint256 totalInputValueSync = bound(_totalInputValueSync, 1, type(uint128).max);
        uint256 totalInputValueAsync = bound(_totalInputValueAsync, 1, type(uint128).max / TOTAL_NUM_ASYNC_BRIDGE_CALLS);

        // Set all the necessary rollup processor balances
        {
            uint256 ethBalance = totalInputValueSync + totalInputValueAsync * TOTAL_NUM_ASYNC_BRIDGE_CALLS;
            uint256 tokenABalance = totalInputValueSync * TOTAL_NUM_SYNC_BRIDGE_CALLS;
            uint256 tokenBBalance = totalInputValueAsync * TOTAL_NUM_ASYNC_BRIDGE_CALLS;

            deal(address(rollupProcessor), ethBalance);
            tokenA.mint(address(rollupProcessor), tokenABalance);
            tokenB.mint(address(rollupProcessor), tokenBBalance);
        }

        // Encode call data for async calls - the data is the same for all of them so we do it once
        uint256 encodedBridgeCallDataAsync = rollupEncoder.encodeBridgeCallData(
            asyncBridgeAddressId, ethAsset, tokenAssetB, tokenAssetA, tokenAssetC, uint64(0)
        );

        // CREATE AND SUBMIT THE FIRST 2 ROLLUP BATCHES
        {
            // Send the first 32 async interactions
            uint256 rollupId = 0;
            uint256 firstNonce = rollupId * NUMBER_OF_BRIDGE_CALLS;
            for (uint256 nonce = firstNonce; nonce < NUMBER_OF_BRIDGE_CALLS; nonce++) {
                rollupEncoder.defiInteractionL2(encodedBridgeCallDataAsync, totalInputValueAsync);
            }
            for (uint256 nonce = firstNonce; nonce < NUMBER_OF_BRIDGE_CALLS; nonce++) {
                vm.expectEmit(true, true, false, true);
                emit AsyncDefiBridgeProcessed(encodedBridgeCallDataAsync, nonce, totalInputValueAsync);
            }

            vm.expectEmit(true, false, false, true);
            emit RollupProcessed(rollupId, new bytes32[](0), ROLLUP_PROVIDER);
            rollupEncoder.processRollup();

            // Send the remaining 8 async interactions
            rollupId = 1;
            firstNonce = rollupId * NUMBER_OF_BRIDGE_CALLS;
            for (uint256 nonce = firstNonce; nonce < firstNonce + 8; nonce++) {
                rollupEncoder.defiInteractionL2(encodedBridgeCallDataAsync, totalInputValueAsync);
            }
            for (uint256 nonce = firstNonce; nonce < firstNonce + 8; nonce++) {
                vm.expectEmit(true, true, false, true);
                emit AsyncDefiBridgeProcessed(encodedBridgeCallDataAsync, nonce, totalInputValueAsync);
            }

            vm.expectEmit(true, false, false, true);
            emit RollupProcessed(rollupId, new bytes32[](0), ROLLUP_PROVIDER);
            rollupEncoder.processRollup();
        }

        // CHECK THE RELEVANT STATE AFTER THE FIRST 2 ROLLUP BATCHES
        {
            assertEq(rollupProcessor.getDataSize(), 80, "Incorrect data tree size");

            assertEq(rollupProcessor.getDefiInteractionHashesLength(), 0, "Incorrect DefiInteractionHashesLength");
            assertEq(
                rollupProcessor.getAsyncDefiInteractionHashesLength(), 0, "Incorrect AsyncDefiInteractionHashesLength"
            );
            assertEq(
                rollupProcessor.getPendingDefiInteractionHashesLength(),
                0,
                "Incorrect PendingDefiInteractionHashesLength"
            );

            // Check that the async interactions are waiting in the `pendingDefiInteractions` mapping
            for (uint256 nonce = 0; nonce < 40; nonce++) {
                (uint256 encodedBridgeCallDataInPending, uint256 totalInputValueInPending) =
                    rollupProcessor.pendingDefiInteractions(nonce);
                assertEq(
                    encodedBridgeCallDataInPending, encodedBridgeCallDataAsync, "Incorrect bridge call data in pending"
                );
                assertEq(totalInputValueInPending, totalInputValueAsync, "Incorrect totalInputValue in pending");
            }
        }

        // FINALIZE 35 ASYNC INTERACTIONS - nonces <0, 34>
        uint256 outputValueAAsync = bound(_outputValueAAsync, 1, type(uint128).max / TOTAL_NUM_ASYNC_BRIDGE_CALLS);
        uint256 outputValueBAsync = bound(_outputValueBAsync, 1, type(uint128).max / TOTAL_NUM_ASYNC_BRIDGE_CALLS);
        {
            tokenA.mint(address(asyncBridge), outputValueAAsync * TOTAL_NUM_ASYNC_BRIDGE_CALLS);
            tokenC.mint(address(asyncBridge), outputValueBAsync * TOTAL_NUM_ASYNC_BRIDGE_CALLS);
            _setAsyncBridgeAction(outputValueAAsync, outputValueBAsync);
            for (uint256 nonce = 0; nonce <= 34; nonce++) {
                vm.expectEmit(true, true, false, true);
                emit DefiBridgeProcessed(
                    encodedBridgeCallDataAsync,
                    nonce,
                    totalInputValueAsync,
                    outputValueAAsync,
                    outputValueBAsync,
                    true,
                    ""
                );
                rollupProcessor.processAsyncDefiInteraction(nonce);
            }
        }

        // Encode call data for sync calls
        uint256 encodedBridgeCallDataSync = rollupEncoder.encodeBridgeCallData(
            syncBridgeAddressId, tokenAssetA, emptyAsset, ethAsset, emptyAsset, uint64(0)
        );

        // SEND THE FIRST SYNC INTERACTION
        uint256 outputValueASync = bound(_outputValueASync, 1, type(uint128).max);
        {
            deal(address(syncBridge), outputValueASync);

            uint256 rollupId = 2;
            uint256 nonce = rollupId * NUMBER_OF_BRIDGE_CALLS;
            _setSyncBridgeAction(outputValueASync, nonce);

            rollupEncoder.defiInteractionL2(encodedBridgeCallDataSync, totalInputValueSync);

            bytes32[] memory nextExpectedDefiHashes = new bytes32[](
                NUMBER_OF_BRIDGE_CALLS
            );
            for (uint256 i = 0; i < NUMBER_OF_BRIDGE_CALLS; i++) {
                nextExpectedDefiHashes[i] = rollupEncoder.computeDefiInteractionHash(
                    encodedBridgeCallDataAsync,
                    i + 3, // nonces <3, 34>
                    totalInputValueAsync,
                    outputValueAAsync,
                    outputValueBAsync,
                    true
                );
            }

            vm.expectEmit(true, true, false, true);
            emit DefiBridgeProcessed(
                encodedBridgeCallDataSync, nonce, totalInputValueSync, outputValueASync, 0, true, ""
            );
            vm.expectEmit(true, false, false, true);
            emit RollupProcessed(rollupId, nextExpectedDefiHashes, ROLLUP_PROVIDER);
            rollupEncoder.processRollup();
        }

        // FINALIZE THE LAST 5 ASYNC INTERACTIONS - nonces <35, 39>
        {
            for (uint256 nonce = 35; nonce <= 39; nonce++) {
                vm.expectEmit(true, true, false, true);
                emit DefiBridgeProcessed(
                    encodedBridgeCallDataAsync,
                    nonce,
                    totalInputValueAsync,
                    outputValueAAsync,
                    outputValueBAsync,
                    true,
                    ""
                );
                rollupProcessor.processAsyncDefiInteraction(nonce);
            }
        }

        // SEND THE SECOND AND LAST SYNC INTERACTION
        {
            deal(address(syncBridge), outputValueASync);

            uint256 rollupId = 3;
            uint256 nonce = rollupId * NUMBER_OF_BRIDGE_CALLS;
            _setSyncBridgeAction(outputValueASync, nonce);

            rollupEncoder.defiInteractionL2(encodedBridgeCallDataSync, totalInputValueSync);

            // THE FOLLOWING  39 LINES ARE JUST DEFINING nextExpectedDefiHashes
            bytes32[] memory nextExpectedDefiHashes = new bytes32[](10);
            // Hash corresponding to first sync interaction
            nextExpectedDefiHashes[0] = rollupEncoder.computeDefiInteractionHash(
                encodedBridgeCallDataSync, 64, totalInputValueSync, outputValueASync, 0, true
            );
            // The remaing 3 hashes from the first batch of finalised interactions
            for (uint256 i = 1; i <= 3; i++) {
                nextExpectedDefiHashes[i] = rollupEncoder.computeDefiInteractionHash(
                    encodedBridgeCallDataAsync, i - 1, totalInputValueAsync, outputValueAAsync, outputValueBAsync, true
                );
            }
            nextExpectedDefiHashes[4] = rollupEncoder.computeDefiInteractionHash(
                encodedBridgeCallDataSync, 96, totalInputValueSync, outputValueASync, 0, true
            );
            // The hashes from the last 5 finalised interactions, nonces <35, 39>
            for (uint256 i = 5; i <= 9; i++) {
                nextExpectedDefiHashes[i] = rollupEncoder.computeDefiInteractionHash(
                    encodedBridgeCallDataAsync, i + 30, totalInputValueAsync, outputValueAAsync, outputValueBAsync, true
                );
            }

            vm.expectEmit(true, true, false, true);
            emit DefiBridgeProcessed(
                encodedBridgeCallDataSync, nonce, totalInputValueSync, outputValueASync, 0, true, ""
            );
            vm.expectEmit(true, false, false, true);
            emit RollupProcessed(rollupId, nextExpectedDefiHashes, ROLLUP_PROVIDER);
            rollupEncoder.processRollup();
        }
    }

    function _setAsyncBridgeAction(uint256 _outputValueA, uint256 _outputValueB) private returns (uint256) {
        AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](
            2
        );
        subActions[0] = AsyncBridge.SubAction({
            target: address(tokenA),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _outputValueA)
        });
        subActions[1] = AsyncBridge.SubAction({
            target: address(tokenC),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _outputValueB)
        });

        asyncBridge.setAction(
            AsyncBridge.Action({
                outputA: _outputValueA,
                outputB: _outputValueB,
                interactionComplete: true,
                subs: subActions
            })
        );
    }

    function _setSyncBridgeAction(uint256 _outputValueA, uint256 _interactionNonce) private returns (uint256) {
        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](
            1
        );
        subActions[0] = SyncBridge.SubAction({
            target: address(rollupProcessor),
            value: _outputValueA,
            data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", _interactionNonce)
        });

        syncBridge.setAction(SyncBridge.Action({outputA: _outputValueA, outputB: 0, subs: subActions}));
    }
}
