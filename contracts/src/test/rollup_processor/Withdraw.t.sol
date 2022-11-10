// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Mintable} from "../mocks/ERC20Mintable.sol";
import {ERC20RevertingTransfer} from "../mocks/ERC20RevertingTransfer.sol";

contract GasGuzzler {
    receive() external payable {
        while (true) {}
    }
}

contract WithdrawTest is TestBase {
    address private constant WITHDRAWER = address(0x20);

    ERC20Mintable private tokenA;
    ERC20RevertingTransfer private tokenR;

    AztecTypes.AztecAsset private ethAsset;
    AztecTypes.AztecAsset private tokenAssetA;
    AztecTypes.AztecAsset private tokenAssetR;

    function setUp() public override {
        super.setUp();
        rollupProcessor.grantRole(rollupProcessor.LISTER_ROLE(), address(this));

        ethAsset = AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.ETH});

        // List token A
        tokenA = new ERC20Mintable('Token A');
        rollupProcessor.setSupportedAsset(address(tokenA), 100000);
        tokenAssetA = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenA),
            assetType: AztecTypes.AztecAssetType.ERC20
        });

        // List token R
        tokenR = new ERC20RevertingTransfer('Token R');
        rollupProcessor.setSupportedAsset(address(tokenR), 100000);
        tokenAssetR = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(tokenR),
            assetType: AztecTypes.AztecAssetType.ERC20
        });

        // Set labels
        vm.label(address(tokenA), tokenA.name());
        vm.label(address(tokenR), tokenR.name());
        vm.label(WITHDRAWER, "WITHDRAWER");

        // Ensure ETH balances are 0 for accounting purposes
        deal(WITHDRAWER, 0);
    }

    function testShouldWithdrawEth() public {
        uint256 withdrawAmount = 10 ether;

        deal(address(rollupProcessor), withdrawAmount);

        rollupEncoder.withdrawL2(ethAsset.id, withdrawAmount, WITHDRAWER);
        rollupEncoder.processRollup();

        assertEq(address(WITHDRAWER).balance, withdrawAmount, "Incorrect balance after withdrawal");
    }

    function testShouldNotRevertIfOOGInEthWithdraw() public {
        GasGuzzler guzzler = new GasGuzzler();

        uint256 withdrawAmount = 10 ether;
        deal(address(rollupProcessor), withdrawAmount);

        rollupEncoder.withdrawL2(ethAsset.id, withdrawAmount, address(guzzler));
        rollupEncoder.processRollup();

        assertEq(address(guzzler).balance, 0, "Incorrect balance after withdrawal");
    }

    function testShouldWithdrawERC20() public {
        uint256 withdrawAmount = 1e18;

        tokenA.mint(address(rollupProcessor), withdrawAmount);

        rollupEncoder.withdrawL2(tokenAssetA.id, withdrawAmount, WITHDRAWER);
        rollupEncoder.processRollup();

        assertEq(tokenA.balanceOf(WITHDRAWER), withdrawAmount, "Incorrect balance after withdrawal");
    }

    function testDoesNotRevertIfWithdrawFails() public {
        uint256 withdrawAmount = 1e18;

        tokenR.mint(address(rollupProcessor), withdrawAmount);

        rollupEncoder.withdrawL2(tokenAssetR.id, withdrawAmount, WITHDRAWER);

        vm.expectEmit(true, false, false, true);
        emit RollupProcessed(0, new bytes32[](0), ROLLUP_PROVIDER);
        rollupEncoder.processRollup();
    }

    function testShouldRevertWhenTryingToWithdrawVirtualAsset() public {
        uint256 withdrawAmount = 1e18;
        uint256 virutalAssetId = 2 + rollupEncoder.VIRTUAL_ASSET_ID_FLAG();

        rollupEncoder.withdrawL2(virutalAssetId, withdrawAmount, WITHDRAWER);

        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();
        vm.prank(ROLLUP_PROVIDER);
        vm.expectRevert(RollupProcessorV2.INVALID_ASSET_ID.selector);
        rollupProcessor.processRollup(encodedProofData, signatures);
    }
}
