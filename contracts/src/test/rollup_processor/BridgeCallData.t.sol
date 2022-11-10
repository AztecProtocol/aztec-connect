// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Mintable} from "../mocks/ERC20Mintable.sol";
import {SyncBridge} from "../mocks/SyncBridge.sol";

contract BridgeCallDataTest is TestBase {
    SyncBridge internal bridge;
    uint256 internal bridgeAddressId;

    AztecTypes.AztecAsset internal tokenAssetA;
    AztecTypes.AztecAsset internal tokenAssetB;
    AztecTypes.AztecAsset internal emptyAsset;
    AztecTypes.AztecAsset internal ethAsset;
    AztecTypes.AztecAsset internal virtualAsset;
    AztecTypes.AztecAsset internal incorrectAsset;

    function setUp() public override {
        super.setUp();
        rollupProcessor.grantRole(rollupProcessor.LISTER_ROLE(), address(this));

        // List the bridge with a large gas amount
        bridge = new SyncBridge();
        rollupProcessor.setSupportedBridge(address(bridge), 1000000);
        bridgeAddressId = rollupProcessor.getSupportedBridgesLength();

        // List token A
        ERC20Mintable tokenA = new ERC20Mintable('TokenA');
        rollupProcessor.setSupportedAsset(address(tokenA), 100000);
        vm.label(address(tokenA), tokenA.name());

        // List token B
        ERC20Mintable tokenB = new ERC20Mintable('TokenB');
        rollupProcessor.setSupportedAsset(address(tokenB), 100000);
        vm.label(address(tokenB), tokenB.name());

        // Setup assets
        tokenAssetA = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenA),
            assetType: AztecTypes.AztecAssetType.ERC20
        });
        tokenAssetB = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenB),
            assetType: AztecTypes.AztecAssetType.ERC20
        });
        ethAsset = AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.ETH});
        virtualAsset =
            AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.VIRTUAL});

        // This asset is incorrect because its type is NOT_USED and id > 0
        incorrectAsset =
            AztecTypes.AztecAsset({id: 1, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.NOT_USED});
    }

    function testRevertIf2InputAssetsAreTheSame() public {
        AztecTypes.AztecAsset[] memory assets = new AztecTypes.AztecAsset[](3);
        assets[0] = tokenAssetA;
        assets[1] = ethAsset;
        assets[2] = virtualAsset;
        assets[2].id = rollupEncoder.VIRTUAL_ASSET_ID_FLAG();

        for (uint256 i; i < assets.length; ++i) {
            AztecTypes.AztecAsset memory inputAsset = assets[i];
            rollupEncoder.defiInteractionL2(
                bridgeAddressId, inputAsset, inputAsset, tokenAssetB, emptyAsset, uint64(0), 1e18
            );
            rollupEncoder.processRollupFail(
                abi.encodeWithSelector(RollupProcessorV2.BRIDGE_WITH_IDENTICAL_INPUT_ASSETS.selector, inputAsset.id)
            );
        }
    }

    function testRevertIf2RealOutputAssetsAreTheSame() public {
        rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, tokenAssetA, tokenAssetA, uint64(0), 1 ether
        );
        rollupEncoder.processRollupFail(
            abi.encodeWithSelector(RollupProcessorV2.BRIDGE_WITH_IDENTICAL_OUTPUT_ASSETS.selector, tokenAssetA.id)
        );
    }

    function testWillNotRevertIf2VirtualOutputAssetsAreTheSame() public {
        uint256 totalInputValue = 1 ether;
        vm.deal(address(rollupProcessor), totalInputValue);
        uint256 encodedBridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, virtualAsset, virtualAsset, uint64(0), totalInputValue
        );

        rollupEncoder.registerEventToBeChecked(
            encodedBridgeCallData, rollupEncoder.getNextNonce(), totalInputValue, 0, 0, true, bytes("")
        );

        rollupEncoder.processRollup();
    }

    function testRevertsIfSecondInputNotInUseAndInputAssetIdBIsNot0() public {
        rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, incorrectAsset, tokenAssetA, tokenAssetA, uint64(0), 1 ether
        );
        rollupEncoder.processRollupFail(RollupProcessorV2.INCONSISTENT_BRIDGE_CALL_DATA.selector);
    }

    function testRevertsIfSecondOutputNotInUseAndInputAssetIdBIsNot0() public {
        rollupEncoder.defiInteractionL2(
            bridgeAddressId, ethAsset, emptyAsset, tokenAssetA, incorrectAsset, uint64(0), 1 ether
        );
        rollupEncoder.processRollupFail(RollupProcessorV2.INCONSISTENT_BRIDGE_CALL_DATA.selector);
    }
}
