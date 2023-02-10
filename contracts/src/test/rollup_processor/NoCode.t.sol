// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Mintable} from "../mocks/ERC20Mintable.sol";
import {SyncBridge} from "../mocks/SyncBridge.sol";

contract NoCodeTest is TestBase {
    address private constant NO_CODE_ADDRESS = address(0x27);

    SyncBridge internal bridge;
    ERC20Mintable internal tokenA;
    ERC20Mintable internal tokenB;

    uint256 internal bridgeAddressId;

    AztecTypes.AztecAsset internal tokenAssetA;
    AztecTypes.AztecAsset internal tokenAssetB;
    AztecTypes.AztecAsset internal emptyAsset;
    AztecTypes.AztecAsset internal ethAsset;

    function setUp() public override(TestBase) {
        super.setUp();
        rollupProcessor.grantRole(rollupProcessor.LISTER_ROLE(), address(this));

        // List the bridge with
        bridge = new SyncBridge();
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

        // List token B
        tokenB = new ERC20Mintable('TokenB');
        rollupProcessor.setSupportedAsset(address(tokenB), 100000);
        tokenAssetB = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenB),
            assetType: AztecTypes.AztecAssetType.ERC20
        });

        // Setup eth asset
        ethAsset = AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.ETH});
    }

    function testRevertsWhenSettingBridgeProxyToAddressWithoutCode() public {
        vm.expectRevert(RollupProcessorV2.INVALID_ADDRESS_NO_CODE.selector);
        rollupProcessor.setDefiBridgeProxy(NO_CODE_ADDRESS);
    }

    function testRevertsWhenSettingVerifierToAddressWithoutCode() public {
        vm.expectRevert(RollupProcessorV2.INVALID_ADDRESS_NO_CODE.selector);
        rollupProcessor.setVerifier(NO_CODE_ADDRESS);
    }

    function testRevertsWhenVerifyingWithNoCodeVerifier() public {
        // Do not mock call to a verifier - would mess with the extcodesize check
        rollupEncoder.setMockVerifierCall(false);

        // Simulate selfdestruct by deleting code from the verifier's address
        vm.etch(rollupProcessor.verifier(), "");

        // Create withdrawal to avoid revert due to empty rollup batch
        rollupEncoder.withdrawL2(0, 1 ether, NO_CODE_ADDRESS);

        rollupEncoder.processRollupFail(RollupProcessorV2.INVALID_ADDRESS_NO_CODE.selector);
    }

    function testRevertsWhenPerformingInteractionUsingNoCodeBridgeProxy() public {
        // Simulate selfdestruct by deleting code from the proxy's address
        vm.etch(rollupProcessor.defiBridgeProxy(), "");

        rollupEncoder.defiInteractionL2(bridgeAddressId, ethAsset, emptyAsset, ethAsset, emptyAsset, uint64(0), 1 ether);

        rollupEncoder.processRollupFail(RollupProcessorV2.INVALID_ADDRESS_NO_CODE.selector);
    }

    function testInteractionRevertsWhenConvertingNoCodeTokenToToken() public {
        // Simulate selfdestruct of tokenA by deleting code from its address
        vm.etch(tokenAssetA.erc20Address, "");

        uint256 totalInputValue = 1e18;
        uint256 bridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, tokenAssetB, emptyAsset, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit DefiBridgeProcessed(
            bridgeCallData,
            0,
            totalInputValue,
            0,
            0,
            false,
            abi.encodePacked(RollupProcessorV2.INVALID_ADDRESS_NO_CODE.selector)
            );
        rollupEncoder.processRollup();
    }

    function testInteractionRevertsWhenConvertingTokenToNoCodeToken() public {
        // Simulate selfdestruct of tokenB by deleting code from its address
        vm.etch(tokenAssetB.erc20Address, "");

        uint256 totalInputValue = 1e18;

        tokenA.mint(address(rollupProcessor), totalInputValue);

        SyncBridge.SubAction[] memory subActions = new SyncBridge.SubAction[](1);
        subActions[0] = SyncBridge.SubAction({
            target: address(tokenB),
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", address(rollupProcessor), totalInputValue)
        });

        SyncBridge.Action memory action = SyncBridge.Action({outputA: totalInputValue, outputB: 0, subs: subActions});

        bridge.setAction(action);

        uint256 bridgeCallData = rollupEncoder.defiInteractionL2(
            bridgeAddressId, tokenAssetA, emptyAsset, tokenAssetB, emptyAsset, uint64(0), totalInputValue
        );

        vm.expectEmit(true, true, false, true);
        emit DefiBridgeProcessed(
            bridgeCallData,
            0,
            totalInputValue,
            0,
            0,
            false,
            abi.encodePacked(RollupProcessorV2.INVALID_ADDRESS_NO_CODE.selector)
            );
        rollupEncoder.processRollup();
    }
}
