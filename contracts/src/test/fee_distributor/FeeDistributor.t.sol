// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Test} from "forge-std/Test.sol";

import {IFeeDistributor, AztecFeeDistributor} from "periphery/AztecFeeDistributor.sol";

contract FeeDistributorTest is Test {
    event FeeReimbursed(address receiver, uint256 amount);
    event Convert(address assetAddress, uint256 inputValue, uint256 outputValue);

    address internal constant UNI_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address internal constant FEE_CLAIMER = address(0x20);
    address internal constant ROLLUP_PROCESSOR = address(0x30);
    address internal constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    IFeeDistributor internal distributor;

    function setUp() public virtual {
        // This contract needs mainnet state because of it's dependency on Uni v2
        string memory url = vm.envString("MAINNET_RPC_URL");
        uint256 forkId = vm.createFork(url);
        vm.selectFork(forkId);

        distributor = new AztecFeeDistributor(FEE_CLAIMER, ROLLUP_PROCESSOR, UNI_V2_ROUTER);
        assertEq(distributor.aztecFeeClaimer(), FEE_CLAIMER, "Fee claimer incorrectly set");

        vm.label(UNI_V2_ROUTER, "UNI_V2_ROUTER");
        vm.label(FEE_CLAIMER, "FEE_CLAIMER");
        vm.label(ROLLUP_PROCESSOR, "ROLLUP_PROCESSOR");
        vm.label(DAI, "DAI");
        vm.label(WETH, "WETH");

        // Ensure ETH balances are 0 for accounting purposes
        deal(FEE_CLAIMER, 0);
        deal(ROLLUP_PROCESSOR, 0);
        deal(address(distributor), 0);
    }

    function testDepositsEthToFeeDistributor() public {
        uint256 toSend = 1e16;
        address(distributor).call{value: toSend}("");

        assertEq(distributor.txFeeBalance(address(0)), toSend, "Incorrect ETH balance");
    }

    function testOwnerCanChangeConvertConstant() public {
        uint256 newConvertConstant = 100;
        assertFalse(distributor.convertConstant() == newConvertConstant, "New convert constant the same as the old one");
        distributor.setConvertConstant(newConvertConstant);
        assertEq(distributor.convertConstant(), newConvertConstant, "Convert constant was not set");
    }

    function testNonOwnerCannotChangeConvertConstant(address _nonOwner) public {
        vm.assume(_nonOwner != address(this));
        uint256 newConvertConstant = 100;

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(_nonOwner);
        distributor.setConvertConstant(newConvertConstant);
    }

    function testOwnerCanChangeFeeClaimer() public {
        address newFeeClaimer = address(0x30);
        distributor.setFeeClaimer(newFeeClaimer);
        assertEq(distributor.aztecFeeClaimer(), newFeeClaimer, "Fee claimer was not set");
    }

    function testNonOwnerCannotChangeFeeClaimer(address _nonOwner) public {
        vm.assume(_nonOwner != address(this));
        address newFeeClaimer = address(0x30);

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(_nonOwner);
        distributor.setFeeClaimer(newFeeClaimer);
    }

    function testReimbursementOfEthToFeeClaimerIfFeeClaimerIsBellowThreshold(uint256 _initialClaimerBalance) public {
        uint256 initialClaimerBalance = bound(_initialClaimerBalance, 1, distributor.feeLimit() - 1);
        deal(FEE_CLAIMER, initialClaimerBalance);

        uint256 toSend = 1e16;

        // Simulate a rollup by sending ETH from rollup processor to fee distributor
        deal(ROLLUP_PROCESSOR, toSend);

        vm.expectEmit(true, true, false, true);
        emit FeeReimbursed(FEE_CLAIMER, toSend);
        vm.prank(ROLLUP_PROCESSOR);
        address(distributor).call{value: toSend}("");

        assertEq(FEE_CLAIMER.balance, initialClaimerBalance + toSend, "Incorrect fee claimer balance");
    }

    function testReimbursementOfEthToFeeClaimerDoesntOccurIfFeeClaimerIsAtThreshold() public {
        uint256 initialClaimerBalance = distributor.feeLimit();
        deal(FEE_CLAIMER, initialClaimerBalance);

        uint256 toSend = 1e16;

        // Simulate a rollup by sending ETH from rollup processor to fee distributor
        deal(ROLLUP_PROCESSOR, toSend);

        vm.prank(ROLLUP_PROCESSOR);
        address(distributor).call{value: toSend}("");

        assertEq(FEE_CLAIMER.balance, initialClaimerBalance, "Incorrect fee claimer balance");
    }

    function testDoesNotReimburseMoreThanFeeLimit() public {
        uint256 toSend = 1 ether;

        // Simulate a rollup by sending ETH from rollup processor to fee distributor
        deal(ROLLUP_PROCESSOR, toSend);

        vm.expectEmit(true, true, false, true);
        emit FeeReimbursed(FEE_CLAIMER, distributor.feeLimit());
        vm.prank(ROLLUP_PROCESSOR);
        address(distributor).call{value: toSend}("");

        assertEq(FEE_CLAIMER.balance, distributor.feeLimit(), "Incorrect fee claimer balance");
    }

    function testConvertsAssetBalanceToEth() public {
        uint256 balance = 1e20;
        // Setting this value low because I don't want dying Uni v2 liquidity to cause revert
        uint256 minOutputValue = 1;

        deal(DAI, address(distributor), balance);

        assertEq(distributor.txFeeBalance(address(0)), 0, "Incorrect ETH balance");
        assertEq(distributor.txFeeBalance(DAI), balance, "Incorrect DAI balance");

        distributor.convert(DAI, minOutputValue);

        assertEq(distributor.txFeeBalance(DAI), 0, "Incorrect DAI balance after convert");
        assertGt(distributor.txFeeBalance(address(0)), minOutputValue, "Incorrect ETH balance after convert");
    }

    function testConvertsWethToEth() public {
        uint256 balance = 1 ether;
        // minOutputValue is not used when unwrapping WETH
        uint256 minOutputValue = 0;

        deal(WETH, address(distributor), balance);

        assertEq(distributor.txFeeBalance(address(0)), 0, "Incorrect ETH balance");
        assertEq(distributor.txFeeBalance(WETH), balance, "Incorrect WETH balance");

        distributor.convert(WETH, minOutputValue);

        assertEq(distributor.txFeeBalance(address(0)), balance, "Incorrect ETH balance after convert");
        assertEq(distributor.txFeeBalance(WETH), 0, "Incorrect WETH balance after convert");
    }

    function testRevertsIfNonOwnerTriesToConvertAssetBalanceToEth(address _nonOwner) public {
        vm.assume(_nonOwner != address(this));

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(_nonOwner);
        distributor.convert(DAI, 0);
    }

    function testRevertIfOutputIsLessThanMinOutputValue() public {
        uint256 balance = 1e20;
        uint256 minOutputValue = type(uint256).max;

        deal(DAI, address(distributor), balance);

        vm.expectRevert("Fee Distributor: INSUFFICIENT_OUTPUT_AMOUNT");
        distributor.convert(DAI, minOutputValue);
    }

    function testCannotConvertEthToEth() public {
        vm.expectRevert("Fee Distributor: NOT_A_TOKEN_ASSET");
        distributor.convert(address(0), 0);
    }

    function testCannotConvertIfBalanceIsEmpty() public {
        vm.expectRevert("Fee Distributor: EMPTY_BALANCE");
        distributor.convert(DAI, 0);
    }
}
