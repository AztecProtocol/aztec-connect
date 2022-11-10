// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Mintable} from "../mocks/ERC20Mintable.sol";
import {AsyncBridge} from "../mocks/AsyncBridge.sol";

contract MultiAsyncTest is TestBase {
    uint256 internal constant NUM_BRIDGE_CALLS_PER_BLOCK = 32;
    // Plus 3, because we want to test the system can handle an async queue larger than NUM_BRIDGE_CALLS_PER_BLOCK.
    uint256 internal constant NUM_BRIDGE_CALLS = NUM_BRIDGE_CALLS_PER_BLOCK + 3;
    uint256 internal constant MAX_ASSET_ID = 2;

    ERC20Mintable internal tokenA;
    ERC20Mintable internal tokenB;

    mapping(uint256 => AztecTypes.AztecAsset) internal assets;
    mapping(uint256 => AsyncBridge) internal bridges;

    AztecTypes.AztecAsset internal emptyAsset;

    function setUp() public override {
        super.setUp();
        rollupProcessor.grantRole(rollupProcessor.LISTER_ROLE(), address(this));

        // List token A
        tokenA = new ERC20Mintable('TokenA');
        rollupProcessor.setSupportedAsset(address(tokenA), 100000);
        uint256 id = rollupProcessor.getSupportedAssetsLength();
        assets[id] =
            AztecTypes.AztecAsset({id: id, erc20Address: address(tokenA), assetType: AztecTypes.AztecAssetType.ERC20});
        vm.label(address(tokenA), tokenA.name());

        // List token B
        tokenB = new ERC20Mintable('TokenB');
        rollupProcessor.setSupportedAsset(address(tokenB), 100000);
        id = rollupProcessor.getSupportedAssetsLength();
        assets[id] =
            AztecTypes.AztecAsset({id: id, erc20Address: address(tokenB), assetType: AztecTypes.AztecAssetType.ERC20});
        vm.label(address(tokenB), tokenB.name());

        // Setup eth asset
        assets[0] = AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.ETH});

        // Deploy and list the bridges
        for (uint256 interactionNonce; interactionNonce < NUM_BRIDGE_CALLS; ++interactionNonce) {
            AsyncBridge bridge = new AsyncBridge();
            rollupProcessor.setSupportedBridge(address(bridge), 1000000);
            bridges[interactionNonce] = bridge;
        }
    }

    function testProcessingOfMultipleAsyncInteractions(
        uint256[NUM_BRIDGE_CALLS] calldata _inputAssetIds,
        uint256[NUM_BRIDGE_CALLS] calldata _outputAssetIdsA,
        uint256[NUM_BRIDGE_CALLS] calldata _outputAssetIdsB,
        uint256[NUM_BRIDGE_CALLS] calldata _totalInputValues,
        uint256[NUM_BRIDGE_CALLS] calldata _outputValuesA,
        uint256[NUM_BRIDGE_CALLS] calldata _outputValuesB
    ) public {
        uint256[NUM_BRIDGE_CALLS] memory inputAssetIds = _bound(_inputAssetIds, 0, MAX_ASSET_ID);
        uint256[NUM_BRIDGE_CALLS] memory outputAssetIdsA = _bound(_outputAssetIdsA, 0, MAX_ASSET_ID);
        uint256[NUM_BRIDGE_CALLS] memory outputAssetIdsB = _bound(_outputAssetIdsB, 0, MAX_ASSET_ID);
        uint256[NUM_BRIDGE_CALLS] memory totalInputValues = _bound(_totalInputValues, 1, type(uint128).max);
        uint256[NUM_BRIDGE_CALLS] memory outputValuesA = _bound(_outputValuesA, 1, type(uint128).max);
        uint256[NUM_BRIDGE_CALLS] memory outputValuesB = _bound(_outputValuesB, 1, type(uint128).max);

        uint256[] memory encodedBridgeCallDatas = new uint256[](NUM_BRIDGE_CALLS);

        for (uint256 interactionNonce; interactionNonce < NUM_BRIDGE_CALLS; ++interactionNonce) {
            // Ensure output asset ids don't collide
            if (outputAssetIdsA[interactionNonce] == outputAssetIdsB[interactionNonce]) {
                outputAssetIdsB[interactionNonce] = (outputAssetIdsB[interactionNonce] + 1) % (MAX_ASSET_ID + 1);
            }

            AsyncBridge bridge = bridges[interactionNonce];

            {
                AsyncBridge.SubAction[] memory subActions = new AsyncBridge.SubAction[](2);
                subActions[0] = _getSubActionById(
                    outputAssetIdsA[interactionNonce], interactionNonce, outputValuesA[interactionNonce]
                );
                subActions[1] = _getSubActionById(
                    outputAssetIdsB[interactionNonce], interactionNonce, outputValuesB[interactionNonce]
                );

                AsyncBridge.Action memory action = AsyncBridge.Action({
                    outputA: outputValuesA[interactionNonce],
                    outputB: outputValuesB[interactionNonce],
                    interactionComplete: true,
                    subs: subActions
                });

                bridge.setAction(action);
            }

            encodedBridgeCallDatas[interactionNonce] = rollupEncoder.defiInteractionL2(
                interactionNonce + 1, // bridgeAddressId
                assets[inputAssetIds[interactionNonce]],
                emptyAsset,
                assets[outputAssetIdsA[interactionNonce]],
                assets[outputAssetIdsB[interactionNonce]],
                uint64(0),
                totalInputValues[interactionNonce]
            );

            // Mint the input asset to RollupProcessor and output assets to the bridge
            _mint(inputAssetIds[interactionNonce], address(rollupProcessor), totalInputValues[interactionNonce]);
            _mint(outputAssetIdsA[interactionNonce], address(bridge), outputValuesA[interactionNonce]);
            _mint(outputAssetIdsB[interactionNonce], address(bridge), outputValuesB[interactionNonce]);

            // Process rollup if there is NUM_BRIDGE_CALLS_PER_BLOCK "queued" in the encoder
            // Note: If we send batch with more than NUM_BRIDGE_CALLS_PER_BLOCK calls, the calls over limit are ignored
            if (interactionNonce == NUM_BRIDGE_CALLS_PER_BLOCK - 1) {
                rollupEncoder.processRollup();
            }
        }
        rollupEncoder.processRollup();

        // Processor now shouldn't hold any ETH or token
        assertEq(address(rollupProcessor).balance, 0, "RollupProcessor unexpectedly holds ETH");
        assertEq(tokenA.balanceOf(address(rollupProcessor)), 0, "RollupProcessor unexpectedly holds token A");
        assertEq(tokenB.balanceOf(address(rollupProcessor)), 0, "RollupProcessor unexpectedly holds token B");

        // Verify number of hashes is as expected
        assertEq(
            rollupProcessor.getDefiInteractionHashesLength(), 0, "Unexpectedly non-zero DefiInteractionHashesLength"
        );
        assertEq(
            rollupProcessor.getAsyncDefiInteractionHashesLength(),
            0,
            "Unexpectedly non-zero AsyncDefiInteractionHashesLength"
        );

        // Finalize all the interactions
        for (uint256 interactionNonce = 0; interactionNonce < NUM_BRIDGE_CALLS; ++interactionNonce) {
            rollupProcessor.processAsyncDefiInteraction(interactionNonce);
        }

        // Check if all the balances have now moved to RollupProcessor
        assertEq(
            address(rollupProcessor).balance,
            _sum(outputValuesA, outputAssetIdsA, 0) + _sum(outputValuesB, outputAssetIdsB, 0),
            "RollupProcessor does not hold correct ETH balance"
        );
        assertEq(
            tokenA.balanceOf(address(rollupProcessor)),
            _sum(outputValuesA, outputAssetIdsA, 1) + _sum(outputValuesB, outputAssetIdsB, 1),
            "RollupProcessor does not hold correct token A balance"
        );
        assertEq(
            tokenB.balanceOf(address(rollupProcessor)),
            _sum(outputValuesA, outputAssetIdsA, 2) + _sum(outputValuesB, outputAssetIdsB, 2),
            "RollupProcessor does not hold correct token B balance"
        );

        assertEq(
            rollupProcessor.getDefiInteractionHashesLength(), 0, "Unexpectedly non-zero DefiInteractionHashesLength"
        );
        assertEq(
            rollupProcessor.getAsyncDefiInteractionHashesLength(),
            NUM_BRIDGE_CALLS,
            "Incorrect AsyncDefiInteractionHashesLength"
        );

        // Send a rollup and check that the contents of the `asyncDefiInteractionHashes` array were correctly moved
        // to `defiInteractionHashes`
        _sendRollupWithDeposit();

        assertEq(
            rollupProcessor.getDefiInteractionHashesLength(),
            NUM_BRIDGE_CALLS,
            "Hashes were not correctly moved to defiInteractionHashesLength"
        );
        assertEq(
            rollupProcessor.getAsyncDefiInteractionHashesLength(),
            0,
            "Hashes were not correctly moved out of asyncDefiInteractionHashes"
        );

        for (uint256 interactionNonce = 0; interactionNonce < NUM_BRIDGE_CALLS; ++interactionNonce) {
            bytes32 expectedDefiInteractionHash = rollupEncoder.computeDefiInteractionHash(
                encodedBridgeCallDatas[interactionNonce],
                interactionNonce,
                totalInputValues[interactionNonce],
                outputValuesA[interactionNonce],
                outputValuesB[interactionNonce],
                true
            );
            assertEq(
                rollupProcessor.defiInteractionHashes(interactionNonce),
                expectedDefiInteractionHash,
                "incorrect rollupProcessor.defiInteractionHashes(interactionNonce)"
            );
        }
    }

    function _bound(uint256[NUM_BRIDGE_CALLS] calldata _array, uint256 _min, uint256 _max)
        private
        returns (uint256[NUM_BRIDGE_CALLS] memory array)
    {
        for (uint256 i; i < NUM_BRIDGE_CALLS; ++i) {
            array[i] = bound(_array[i], _min, _max);
        }
    }

    function _getSubActionById(uint256 _assetId, uint256 _interactionNonce, uint256 _outputValue)
        private
        returns (AsyncBridge.SubAction memory subAction)
    {
        if (_assetId == 0) {
            return AsyncBridge.SubAction({
                target: address(rollupProcessor),
                value: _outputValue,
                data: abi.encodeWithSignature("receiveEthFromBridge(uint256)", _interactionNonce)
            });
        }
        return AsyncBridge.SubAction({
            target: assets[_assetId].erc20Address,
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), _outputValue)
        });
    }

    function _mint(uint256 _assetId, address _recipient, uint256 _amount) private {
        if (_assetId == 0) {
            deal(_recipient, _recipient.balance + _amount);
        } else {
            ERC20Mintable(assets[_assetId].erc20Address).mint(_recipient, _amount);
        }
    }

    function _sum(
        uint256[NUM_BRIDGE_CALLS] memory _values,
        uint256[NUM_BRIDGE_CALLS] memory _assetIds,
        uint256 _assetId
    ) private returns (uint256 sum) {
        for (uint256 i; i < NUM_BRIDGE_CALLS; ++i) {
            if (_assetIds[i] == _assetId) {
                sum += _values[i];
            }
        }
    }

    // @dev The only purpose of this function is to ensure that rollup batch is not empty
    function _sendRollupWithDeposit() private {
        AztecTypes.AztecAsset memory ethAsset =
            AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.ETH});
        uint256 depositorPrivKey = 0x676fa108d25db313eedc050f53eeedf8be73faa59bd405ecaa6a274fa3dfc101;
        address depositor = 0x96EA9a0C5010Dae807A279597080aa0dB1EeB10C;
        uint256 depositAmount = 1 ether;
        uint256 fee = 5e16;

        vm.deal(depositor, depositAmount);

        vm.prank(depositor);
        rollupProcessor.depositPendingFunds{value: depositAmount}(ethAsset.id, depositAmount, depositor, "");

        rollupEncoder.depositL2(ethAsset.id, depositAmount - fee, fee, depositorPrivKey);
        rollupEncoder.processRollup();
    }
}
