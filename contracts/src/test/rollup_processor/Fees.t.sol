// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Mintable} from "../mocks/ERC20Mintable.sol";

contract NoEthPlease {}

contract GasGuzzler {
    receive() external payable {
        while (true) {}
    }
}

contract FeesTest is TestBase {
    uint256 private constant MAX_ASSETS_IN_BLOCK = 16;
    uint256 private constant DEPOSITOR_PRIV_KEY = 0x676fa108d25db313eedc050f53eeedf8be73faa59bd405ecaa6a274fa3dfc101;
    address private constant DEPOSITOR = 0x96EA9a0C5010Dae807A279597080aa0dB1EeB10C;
    address private constant BENEFICIARY = address(0x20);

    uint256 private constant ETH_ASSET_ID = 0;

    // assetId => amount
    mapping(uint256 => uint256) private fees;
    // assetId => ERC20Mintable
    mapping(uint256 => ERC20Mintable) private tokens;

    function setUp() public override {
        super.setUp();
        rollupProcessor.grantRole(rollupProcessor.LISTER_ROLE(), address(this));

        // Disable caps --> those are tested in Deposit.t.sol
        rollupProcessor.setCapped(false);

        rollupEncoder.setRollupBeneficiary(BENEFICIARY);

        // Wipe beneficiary's balance for accounting purposes
        deal(BENEFICIARY, 0);

        // Set up labels
        vm.label(DEPOSITOR, "DEPOSITOR");
        vm.label(BENEFICIARY, "BENEFICIARY");

        // Deploy tokens
        for (uint256 assetId; assetId < MAX_ASSETS_IN_BLOCK; ++assetId) {
            if (assetId != ETH_ASSET_ID) {
                ERC20Mintable token = new ERC20Mintable('Token');
                rollupProcessor.setSupportedAsset(address(token), 100000);
                tokens[assetId] = token;
            }
        }
    }

    function testShouldProcessERC20OutOfGas() public {
        // Set the storage `gasLimits[1] = 100`
        vm.store(
            address(rollupProcessor),
            bytes32(uint256(75885601358636693696949802906298188001431145678381949700310637158053438652935)),
            bytes32(uint256(100))
        );
        assertEq(rollupProcessor.assetGasLimits(1), 100);
        _createDeposit(1, 1 ether);
        rollupEncoder.processRollup();
        assertEq(tokens[1].balanceOf(BENEFICIARY), 0, "Incorrect token balance");
    }

    function testShouldProcessEthFeesWhenRecipientRejects() public {
        _createDeposit(0, 1 ether);
        NoEthPlease nope = new NoEthPlease();
        rollupEncoder.setRollupBeneficiary(address(nope));
        rollupEncoder.processRollup();
        assertEq(address(nope).balance, 0, "Nope received eth");
    }

    function testShouldProcessEthFeesWhenRecipientOOG() public {
        _createDeposit(0, 1 ether);
        GasGuzzler guzzler = new GasGuzzler();
        rollupEncoder.setRollupBeneficiary(address(guzzler));
        rollupEncoder.processRollup();
        assertEq(address(guzzler).balance, 0, "guzzler received eth");
    }

    function testShouldCorrectlyProcessFees(uint256[MAX_ASSETS_IN_BLOCK] calldata _feeAmounts) public {
        uint256[MAX_ASSETS_IN_BLOCK] memory feeAmounts;

        // Bound the fees and create deposits
        for (uint256 assetId = 0; assetId < MAX_ASSETS_IN_BLOCK; ++assetId) {
            // Subtracting 1 so that the value can never be type(uint256).max -> This is necessary so that deposit
            // amount can always be bigger than fee
            feeAmounts[assetId] = bound(_feeAmounts[assetId], 1, type(uint256).max - 1);
            if (feeAmounts[assetId] > 0) {
                _createDeposit(assetId, feeAmounts[assetId]);
            }
        }

        // An edge case can occurr in which all the deposit amounts would be 0 --> this would cause revert
        vm.assume(rollupEncoder.depositsL2Length() > 0);

        rollupEncoder.processRollup();

        assertEq(BENEFICIARY.balance, feeAmounts[ETH_ASSET_ID], "Incorrect ETH balance");

        for (uint256 assetId = 1; assetId < MAX_ASSETS_IN_BLOCK; ++assetId) {
            assertEq(tokens[assetId].balanceOf(BENEFICIARY), feeAmounts[assetId], "Incorrect token balance");
        }
    }

    function _createDeposit(uint256 _assetId, uint256 _depositFee) private {
        uint256 depositAmount = _depositFee + 1;

        uint256 msgValue;
        if (_assetId == ETH_ASSET_ID) {
            deal(DEPOSITOR, depositAmount);
            msgValue = depositAmount;
        } else {
            ERC20Mintable token = tokens[_assetId];
            token.mint(DEPOSITOR, depositAmount);
            vm.prank(DEPOSITOR);
            token.approve(address(rollupProcessor), depositAmount);
        }

        vm.prank(DEPOSITOR);
        rollupProcessor.depositPendingFunds{value: msgValue}(_assetId, depositAmount, DEPOSITOR, "");

        assertEq(
            rollupProcessor.userPendingDeposits(_assetId, DEPOSITOR),
            depositAmount,
            "pendingDeposit differs from depositAmount"
        );

        rollupEncoder.depositL2(_assetId, depositAmount - _depositFee, _depositFee, DEPOSITOR_PRIV_KEY);
    }
}
