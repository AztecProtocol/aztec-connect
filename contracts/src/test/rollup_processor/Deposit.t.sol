// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {RollupProcessorLibrary} from "rollup-encoder/libraries/RollupProcessorLibrary.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Permit} from "../mocks/ERC20Permit.sol";

contract DepositTest is TestBase {
    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    ERC20Permit internal token;
    ERC20Permit internal token6Dec;
    ERC20Permit internal noCapToken;
    ERC20Permit internal noCapToken6Dec;

    AztecTypes.AztecAsset internal ethAsset;
    AztecTypes.AztecAsset internal tokenAsset;
    AztecTypes.AztecAsset internal tokenAsset6Dec;
    AztecTypes.AztecAsset internal noCapAsset;
    AztecTypes.AztecAsset internal noCapAsset6Dec;
    AztecTypes.AztecAsset internal emptyAsset;

    mapping(uint256 => AztecTypes.AztecAsset) internal assets;

    function setUp() public override {
        super.setUp();
        rollupProcessor.grantRole(rollupProcessor.LISTER_ROLE(), address(this));

        // Setup capped eth asset
        // Note: cap defined in RollupProcessorV2.initialize()
        ethAsset = AztecTypes.AztecAsset({id: 0, erc20Address: address(0), assetType: AztecTypes.AztecAssetType.ETH});

        // List capped token
        // Note: cap defined in RollupProcessorV2.initialize()
        token = new ERC20Permit('Token');
        rollupProcessor.setSupportedAsset(address(token), 55000);
        tokenAsset = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(token),
            assetType: AztecTypes.AztecAssetType.ERC20
        });
        permitHelper.preApprove(tokenAsset.erc20Address);
        assets[tokenAsset.id] = tokenAsset;

        // List capped token with 6 decimals
        token6Dec = new ERC20Permit('Token6Dec');
        token6Dec.setDecimals(6);
        rollupProcessor.setSupportedAsset(address(token6Dec), 55000);
        tokenAsset6Dec = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(token6Dec),
            assetType: AztecTypes.AztecAssetType.ERC20
        });
        permitHelper.preApprove(tokenAsset6Dec.erc20Address);
        assets[tokenAsset6Dec.id] = tokenAsset6Dec;
        rollupProcessor.setAssetCap(tokenAsset6Dec.id, 30, 800, 6);

        // List token without cap
        noCapToken = new ERC20Permit('NoCapToken');
        rollupProcessor.setSupportedAsset(address(noCapToken), 55000);
        noCapAsset = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(noCapToken),
            assetType: AztecTypes.AztecAssetType.ERC20
        });
        permitHelper.preApprove(noCapAsset.erc20Address);
        assets[noCapAsset.id] = noCapAsset;

        // List token without cap with 6 decimals
        noCapToken6Dec = new ERC20Permit('NoCapToken6Dec');
        noCapToken6Dec.setDecimals(6);
        rollupProcessor.setSupportedAsset(address(noCapToken6Dec), 55000);
        noCapAsset6Dec = AztecTypes.AztecAsset({
            id: rollupProcessor.getSupportedAssetsLength(),
            erc20Address: address(noCapToken6Dec),
            assetType: AztecTypes.AztecAssetType.ERC20
        });
        permitHelper.preApprove(noCapAsset6Dec.erc20Address);
        assets[noCapAsset6Dec.id] = noCapAsset6Dec;

        // Verify caps are set as expected for assets which had them set in initializer
        (,, uint32 pendingCap,,) = rollupProcessor.caps(ethAsset.id);
        assertGt(pendingCap, 0, "No pending cap set for ETH");
        (,, pendingCap,,) = rollupProcessor.caps(tokenAsset.id);
        assertGt(pendingCap, 0, "No pending cap set for tokenAsset");
    }

    function testShouldDepositEthAndConvertToNotes(uint128 _privKey, uint96 _depositAmount, bool _capped) public {
        rollupProcessor.setCapped(_capped);

        uint256 privKey = bound(_privKey, 1, type(uint128).max);
        address l2Owner = vm.addr(privKey);
        _testShouldDepositETHAndConvertToNotes(l2Owner, _privKey, _depositAmount);
    }

    function testShouldDepositERC20AndConvertToNotes(
        uint8 _assetId,
        uint128 _privKey,
        uint96 _depositAmount,
        bool _capped
    ) public {
        uint256 assetId = bound(_assetId, 1, rollupProcessor.getSupportedAssetsLength());

        (,, uint32 pendingCap,,) = rollupProcessor.caps(assetId);

        bool capped = (pendingCap == 0) ? false : _capped;
        rollupProcessor.setCapped(capped);

        uint256 privKey = bound(_privKey, 1, type(uint128).max);
        address l2Owner = vm.addr(privKey);
        _testShouldDepositERC20AndConvertToNotes(assets[assetId], l2Owner, _privKey, _depositAmount);
    }

    function testShouldProcessMultipleDepositInOneRollup(
        uint256[4] memory _assetIds,
        uint128[4] memory _privKeys,
        uint96[4] memory _depositAmounts
    ) public {
        rollupProcessor.setCapped(false);

        for (uint256 i = 0; i < 4; i++) {
            uint256 assetId = bound(_assetIds[i], 0, 4);
            uint256 privKey = bound(_privKeys[i], 1, type(uint128).max);
            address depositor = vm.addr(privKey);
            _acceptableL1Depositor(depositor);
            uint256 fee;
            uint256 depositAmount;
            if (assetId == 0) {
                depositAmount = bound(_depositAmounts[i], 0.1 ether, 500 ether);
                fee = 0.01 ether;
                vm.deal(depositor, depositAmount);

                uint256 balanceBefore = address(rollupProcessor).balance;

                vm.prank(depositor);
                rollupProcessor.depositPendingFunds{value: depositAmount}(assetId, depositAmount, depositor, "");
                rollupEncoder.depositL2(assetId, depositAmount - fee, fee, privKey);

                assertEq(
                    address(rollupProcessor).balance,
                    balanceBefore + depositAmount,
                    "rollupProcessor balance differs from depositAmount"
                );
            } else {
                ERC20Permit token = ERC20Permit(assets[assetId].erc20Address);
                depositAmount = bound(_depositAmounts[i], 10 ** token.decimals(), 500 * 10 ** token.decimals());
                fee = 10 ** token.decimals() / 100;

                token.mint(depositor, depositAmount);

                vm.prank(depositor);
                token.approve(address(rollupProcessor), type(uint256).max);

                uint256 balanceBefore = token.balanceOf(address(rollupProcessor));

                vm.prank(depositor);
                rollupProcessor.depositPendingFunds(assetId, depositAmount, depositor, "");
                rollupEncoder.depositL2(assetId, depositAmount - fee, fee, privKey);

                assertEq(
                    token.balanceOf(address(rollupProcessor)),
                    balanceBefore + depositAmount,
                    "rollupProcessor balance differs from depositAmount"
                );
            }
        }

        rollupEncoder.processRollup();

        for (uint256 i = 0; i < 4; i++) {
            uint256 assetId = bound(_assetIds[i], 0, 2);
            uint256 privKey = bound(_privKeys[i], 1, type(uint128).max);
            address depositor = vm.addr(privKey);

            assertEq(rollupProcessor.userPendingDeposits(assetId, depositor), 0, "Deposit was not processed");
        }
    }

    function testShouldDepositERC20WithPermit(uint128 _privKey, uint96 _depositAmount) public {
        _testShouldDepositFundsViaPermit(tokenAsset, _privKey, _depositAmount, true);
        _testShouldDepositFundsViaPermit(noCapAsset6Dec, _privKey, _depositAmount, true);
    }

    function testShouldRejectDepositERC20WithPermitOnBehalf(uint128 _privKey, uint96 _depositAmount) public {
        _testShouldDepositFundsViaPermit(tokenAsset, _privKey, _depositAmount, false);
        _testShouldDepositFundsViaPermit(noCapAsset6Dec, _privKey, _depositAmount, false);
    }

    function testShouldDepositERC20WithPermitNonStandard(uint128 _privKey, uint96 _depositAmount) public {
        _testShouldDepositFundsViaPermitNonStandard(tokenAsset, _privKey, _depositAmount, true);
        _testShouldDepositFundsViaPermitNonStandard(noCapAsset6Dec, _privKey, _depositAmount, true);
    }

    function testShouldRejectDepositERC20WithPermitNonStandardOnBehalf(uint128 _privKey, uint96 _depositAmount)
        public
    {
        _testShouldDepositFundsViaPermitNonStandard(tokenAsset, _privKey, _depositAmount, false);
        _testShouldDepositFundsViaPermitNonStandard(noCapAsset6Dec, _privKey, _depositAmount, false);
    }

    function testShouldDepositToProofHash(uint128 _privKey, uint96 _depositAmount) public {
        rollupProcessor.setCapped(false);

        uint256 privKey = bound(_privKey, 1, type(uint128).max);
        address depositor = vm.addr(privKey);
        _acceptableL1Depositor(depositor);
        uint256 depositAmount = bound(_depositAmount, 0.1 ether, 50 ether);
        uint256 fee = depositAmount / 100 < 100 ? depositAmount / 100 : 100;

        bytes memory full = abi.encodePacked(
            bytes32(uint256(1)),
            bytes32("leaf1"),
            bytes32("leaf2"),
            bytes32("null1"),
            bytes32("null2"),
            bytes32(depositAmount),
            bytes32(uint256(uint160(depositor))),
            bytes32(0)
        );
        bytes32 digest = keccak256(full);

        vm.deal(depositor, depositAmount);
        vm.prank(depositor);
        rollupProcessor.depositPendingFunds{value: depositAmount}(ethAsset.id, depositAmount, depositor, digest);
        rollupEncoder.depositL2(ethAsset.id, depositAmount - fee, fee, privKey, digest);

        assertEq(
            rollupProcessor.userPendingDeposits(ethAsset.id, depositor),
            depositAmount,
            "pendingDeposit differs from depositAmount"
        );

        assertEq(address(rollupProcessor).balance, depositAmount, "rollupProcessor balance differs from depositAmount");

        rollupEncoder.processRollup();

        assertEq(rollupProcessor.userPendingDeposits(ethAsset.id, depositor), 0, "Deposit was not processed");
    }

    function testShouldDepositWithProofApproval(uint128 _privKey, uint96 _depositAmount) public {
        rollupProcessor.setCapped(false);

        uint256 privKey = bound(_privKey, 1, type(uint128).max);
        address depositor = vm.addr(privKey);
        _acceptableL1Depositor(depositor);
        uint256 depositAmount = bound(_depositAmount, 0.1 ether, 50 ether);
        uint256 fee = depositAmount / 100 < 100 ? depositAmount / 100 : 100;

        bytes memory full = abi.encodePacked(
            bytes32(uint256(1)),
            bytes32("leaf1"),
            bytes32("leaf2"),
            bytes32("null1"),
            bytes32("null2"),
            bytes32(depositAmount),
            bytes32(uint256(uint160(depositor))),
            bytes32(0)
        );
        bytes32 digest = keccak256(full);

        vm.deal(depositor, depositAmount);

        vm.prank(depositor);
        rollupProcessor.depositPendingFunds{value: depositAmount}(ethAsset.id, depositAmount, depositor, "");

        vm.prank(depositor);
        rollupProcessor.approveProof(digest);
        rollupEncoder.depositL2(ethAsset.id, depositAmount - fee, fee, privKey, digest);

        assertEq(
            rollupProcessor.userPendingDeposits(ethAsset.id, depositor),
            depositAmount,
            "pendingDeposit differs from depositAmount"
        );

        assertEq(address(rollupProcessor).balance, depositAmount, "rollupProcessor balance differs from depositAmount");

        rollupEncoder.processRollup();

        assertEq(rollupProcessor.userPendingDeposits(ethAsset.id, depositor), 0, "Deposit was not processed");
    }

    function testShouldRevertBadSignatureInRollup(uint128 _privKey, uint96 _depositAmount) public {
        rollupProcessor.setCapped(false);

        uint256 privKey = bound(_privKey, 1, type(uint128).max);
        address l2Owner = vm.addr(privKey);
        _acceptableL1Depositor(l2Owner);
        uint256 depositAmount = bound(_depositAmount, 0.1 ether, 50 ether);
        uint256 fee = depositAmount / 100 < 100 ? depositAmount / 100 : 100;

        vm.deal(l2Owner, depositAmount);
        vm.prank(l2Owner);
        rollupProcessor.depositPendingFunds{value: depositAmount}(ethAsset.id, depositAmount, l2Owner, "");
        rollupEncoder.depositL2(ethAsset.id, depositAmount - fee, fee, privKey);

        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();

        // Overwrite the first signature with random blabber
        assembly {
            mstore(add(signatures, 0x20), 0x1234)
        }

        vm.prank(ROLLUP_PROVIDER);
        vm.expectRevert(RollupProcessorLibrary.INVALID_SIGNATURE.selector);
        rollupProcessor.processRollup(encodedProofData, signatures);
    }

    function testShouldRevertInsufficientDeposit(address _l1Depositor, uint128 _privKey, uint96 _depositAmount)
        public
    {
        _acceptableL1Depositor(_l1Depositor);
        ERC20Permit token = ERC20Permit(tokenAsset.erc20Address);
        uint8 decimals = token.decimals();
        uint256 privKey = bound(_privKey, 1, type(uint128).max);
        address l2Owner = vm.addr(privKey);
        uint256 depositAmount = bound(_depositAmount, uint256(10 ** (decimals - 1)), uint256(50 * 10 ** decimals));
        uint256 fee = depositAmount / 100 < 100 ? depositAmount / 100 : 100;

        token.mint(_l1Depositor, depositAmount);

        vm.prank(_l1Depositor);
        token.approve(address(rollupProcessor), type(uint256).max);

        vm.prank(_l1Depositor);
        rollupProcessor.depositPendingFunds(tokenAsset.id, depositAmount - 1, l2Owner, "");

        assertEq(
            rollupProcessor.userPendingDeposits(tokenAsset.id, l2Owner),
            depositAmount - 1,
            "pendingDeposit differs from depositAmount"
        );

        assertEq(
            token.balanceOf(address(rollupProcessor)),
            depositAmount - 1,
            "rollupProcessor balance differs from depositAmount"
        );

        rollupEncoder.depositL2(tokenAsset.id, depositAmount - fee, fee, privKey);
        rollupEncoder.processRollupFail(RollupProcessorV2.INSUFFICIENT_DEPOSIT.selector);

        assertEq(
            rollupProcessor.userPendingDeposits(tokenAsset.id, l2Owner), depositAmount - 1, "Deposit was processed"
        );
    }

    function testShouldRevertInconsistentValueEth(uint128 _privKey, uint96 _depositAmount) public {
        vm.expectRevert(RollupProcessorV2.MSG_VALUE_WRONG_AMOUNT.selector);
        rollupProcessor.depositPendingFunds(0, 10 ether, address(this), "");
    }

    function testShouldRevertERC20DepositWithEthValue(uint128 _privKey, uint96 _depositAmount) public {
        vm.expectRevert(RollupProcessorV2.DEPOSIT_TOKENS_WRONG_PAYMENT_TYPE.selector);
        rollupProcessor.depositPendingFunds{value: 1 ether}(1, 10 ether, address(this), "");
    }

    function testShouldDepositEthToOtherOwner(address _sender, uint128 _privKey, uint96 _depositAmount) public {
        _testShouldDepositETHAndConvertToNotes(_sender, _privKey, _depositAmount);
    }

    function testShouldDepositERC20ToOtherOwner(address _sender, uint128 _privKey, uint96 _depositAmount) public {
        _testShouldDepositERC20AndConvertToNotes(tokenAsset, _sender, _privKey, _depositAmount);
        _testShouldDepositERC20AndConvertToNotes(noCapAsset6Dec, _sender, _privKey, _depositAmount);
    }

    function testShouldRevertERC20DepositInsufficientApproval(uint128 _privKey, uint96 _depositAmount) public {
        vm.expectRevert(RollupProcessorV2.INSUFFICIENT_TOKEN_APPROVAL.selector);
        rollupProcessor.depositPendingFunds(1, 10 ether, address(this), "");
    }

    function testFailShouldRevertDepositNonSupportedAsset() public {
        rollupProcessor.depositPendingFunds(666, 10 ether, address(this), "");
    }

    function testShouldRevertDepositVirtualAsset() public {
        vm.expectRevert(RollupProcessorV2.INVALID_ASSET_ID.selector);
        rollupProcessor.depositPendingFunds(2 ** 29, 10 ether, address(this), "");
    }

    function testShouldRevertDepositVirtualAssetWithPermit() public {
        vm.expectRevert(RollupProcessorV2.INVALID_ASSET_ID.selector);
        permitHelper.depositPendingFundsPermit(
            2 ** 29,
            10 ether,
            address(this),
            block.timestamp + 1 hours,
            uint8(8),
            keccak256("blabber 1"),
            keccak256("blabber 2")
        );
    }

    function testShouldRevertDepositVirtualAssetWithPermitNonStandard() public {
        vm.expectRevert(RollupProcessorV2.INVALID_ASSET_ID.selector);
        permitHelper.depositPendingFundsPermitNonStandard(
            2 ** 29,
            10 ether,
            address(this),
            1,
            block.timestamp + 1 hours,
            uint8(8),
            keccak256("blabber 1"),
            keccak256("blabber 2")
        );
    }

    // CAP RELATED TESTS

    function testDepositRevertsWhenAssetSpecificCapNotSet() public {
        vm.expectRevert(RollupProcessorV2.PENDING_CAP_SURPASSED.selector);
        rollupProcessor.depositPendingFunds(noCapAsset6Dec.id, 1e18, address(0x20), "");
    }

    function testDepositRevertsWhenAmountOverPendingLimit(uint256 _depositAmount) public {
        uint256 depositLimit = _computePendingLimit(tokenAsset.id);

        uint256 depositAmount = bound(_depositAmount, depositLimit + 1, type(uint256).max);

        vm.expectRevert(RollupProcessorV2.PENDING_CAP_SURPASSED.selector);
        rollupProcessor.depositPendingFunds(tokenAsset.id, depositAmount, address(0x20), "");
    }

    function testRejectsDepositWhenItAlongWithPriorDepositsReachesPendingLimit(
        uint8 _assetId,
        address _l1Depositor1,
        address _l1Depositor2,
        address _l2Owner,
        uint256 _amount1,
        uint256 _amount2
    ) public {
        _acceptableL1Depositor(_l1Depositor1);
        _acceptableL1Depositor(_l1Depositor2);

        // Capped assetIds are 0, 1, 2
        uint256 assetId = bound(_assetId, 0, 2);
        uint256 pendingLimit = _computePendingLimit(assetId);

        // 1ST DEPOSIT - is within limits hence should succeed
        uint256 amount1 = bound(_amount1, 1, pendingLimit);

        uint256 msgValue;
        if (assetId == 0) {
            deal(_l1Depositor1, amount1);
            msgValue = amount1;
        } else {
            ERC20Permit token = ERC20Permit(assets[assetId].erc20Address);
            token.mint(_l1Depositor1, amount1);
            vm.prank(_l1Depositor1);
            token.approve(address(rollupProcessor), amount1);
        }

        vm.prank(_l1Depositor1);
        rollupProcessor.depositPendingFunds{value: msgValue}(assetId, amount1, _l2Owner, "");
        assertEq(
            rollupProcessor.userPendingDeposits(assetId, _l2Owner), amount1, "pendingDeposit differs from depositAmount"
        );

        // 2ND DEPOSIT - should revert with PENDING_CAP_SURPASSED error
        uint256 amount2 = bound(_amount2, pendingLimit - amount1 + 1, type(uint128).max);

        if (assetId == 0) {
            deal(_l1Depositor2, amount2);
            msgValue = amount2;
        } else {
            ERC20Permit token = ERC20Permit(assets[assetId].erc20Address);
            token.mint(_l1Depositor2, amount2);
            vm.prank(_l1Depositor2);
            token.approve(address(rollupProcessor), amount2);
            msgValue = 0;
        }

        vm.prank(_l1Depositor2);
        vm.expectRevert(RollupProcessorV2.PENDING_CAP_SURPASSED.selector);
        rollupProcessor.depositPendingFunds{value: msgValue}(assetId, amount2, _l2Owner, "");
    }

    function testRevertsWhenDepositIsBellowPendingButCrossingDaily(
        address _l1Depositor,
        address _l2Owner,
        uint256 _newDailyCap,
        uint256 _amount
    ) public {
        _acceptableL1Depositor(_l1Depositor);

        (,, uint32 pendingCap,, uint8 precision) = rollupProcessor.caps(ethAsset.id);

        uint32 newDailyCap = uint32(bound(_newDailyCap, 2, pendingCap - 2));

        vm.expectEmit(true, true, false, true);
        emit AssetCapUpdated(ethAsset.id, pendingCap, newDailyCap);
        rollupProcessor.setAssetCap(ethAsset.id, pendingCap, newDailyCap, precision);

        uint256 amount = bound(_amount, newDailyCap * 10 ** precision + 1, pendingCap * 10 ** precision);
        deal(_l1Depositor, amount);

        vm.prank(_l1Depositor);
        vm.expectRevert(RollupProcessorV2.DAILY_CAP_SURPASSED.selector);
        rollupProcessor.depositPendingFunds{value: amount}(ethAsset.id, amount, _l2Owner, "");
    }

    function testAccrualToAvailableLimitedByDailycap() public {
        (uint128 available,, uint32 pendingCap, uint32 dailyCap, uint8 precision) = rollupProcessor.caps(ethAsset.id);
        assertEq(available, dailyCap * 10 ** precision);

        address depositor = address(0x20);
        uint256 depositAmount = _computePendingLimit(ethAsset.id);

        deal(depositor, depositAmount);

        rollupProcessor.depositPendingFunds{value: depositAmount}(ethAsset.id, depositAmount, depositor, "");
        assertEq(
            rollupProcessor.userPendingDeposits(ethAsset.id, depositor),
            depositAmount,
            "pendingDeposit differs from depositAmount"
        );
        assertEq(address(rollupProcessor).balance, depositAmount, "rollupProcessor balance differs from depositAmount");

        (uint128 updatedAvailable,,,,) = rollupProcessor.caps(ethAsset.id);
        assertEq(updatedAvailable, dailyCap * 10 ** precision - depositAmount);
    }

    // @dev I do 2 deposits so that testing the formula doesn't start with available equal to 0
    function testAccrualFormulaBehavesAsExpected(
        address _depositor,
        uint256 _amount1,
        uint256 _amount2,
        uint8 _decimals,
        uint32 _timeDiff
    ) public {
        _acceptableL1Depositor(_depositor);

        {
            (,, uint32 pendingCap, uint32 dailyCap,) = rollupProcessor.caps(tokenAsset.id);

            uint8 decimals = uint8(bound(_decimals, 1, 50));
            token.setDecimals(decimals);
            rollupProcessor.setAssetCap(tokenAsset.id, pendingCap, dailyCap, 6);
        }

        uint256 pendingLimit = _computePendingLimit(tokenAsset.id);

        // 1ST DEPOSIT
        uint256 amount1 = bound(_amount1, 1, pendingLimit - 1);

        token.mint(_depositor, amount1);
        vm.prank(_depositor);
        token.approve(address(rollupProcessor), amount1);

        vm.prank(_depositor);
        rollupProcessor.depositPendingFunds(tokenAsset.id, amount1, _depositor, "");
        assertEq(
            rollupProcessor.userPendingDeposits(tokenAsset.id, _depositor),
            amount1,
            "pendingDeposit differs from amount1"
        );

        uint256 amount2 = bound(_amount2, 1, pendingLimit - amount1);
        uint256 expectedAvailable;

        {
            vm.warp(block.timestamp + _timeDiff);

            (uint128 available, uint32 lastUpdatedTimestamp, uint32 pendingCap, uint32 dailyCap, uint8 precision) =
                rollupProcessor.caps(tokenAsset.id);

            uint256 dailyCapExpanded = dailyCap * 10 ** precision;

            assertEq(available, dailyCapExpanded - amount1, "Unexpected available after 1st deposit");

            uint256 rate = dailyCapExpanded / 1 days;
            uint256 increment = rate * _timeDiff;
            uint256 updatedAvailable = available + increment;

            if (updatedAvailable > dailyCapExpanded) {
                updatedAvailable = dailyCapExpanded;
            }

            expectedAvailable = updatedAvailable - amount2;
        }

        // 2ND DEPOSIT

        token.mint(_depositor, amount2);
        vm.prank(_depositor);
        token.approve(address(rollupProcessor), amount2);

        vm.prank(_depositor);
        rollupProcessor.depositPendingFunds(tokenAsset.id, amount2, _depositor, "");

        {
            assertEq(
                rollupProcessor.userPendingDeposits(tokenAsset.id, _depositor),
                amount1 + amount2,
                "pendingDeposit differs from sum of amounts"
            );

            (uint128 available, uint32 lastUpdatedTimestamp, uint32 pendingCap, uint32 dailyCap, uint8 precision) =
                rollupProcessor.caps(tokenAsset.id);

            assertEq(available, expectedAvailable, "Incorrect available");
        }
    }

    function _testShouldDepositETHAndConvertToNotes(address _l1Depositor, uint128 _privKey, uint96 _depositAmount)
        internal
    {
        _acceptableL1Depositor(_l1Depositor);
        uint256 privKey = bound(_privKey, 1, type(uint128).max);
        address l2Owner = vm.addr(privKey);

        uint256 depositUpperLimit = rollupProcessor.getCapped() ? _computePendingLimit(ethAsset.id) : 50 ether;

        uint256 depositAmount = bound(_depositAmount, 0.1 ether, depositUpperLimit);
        uint256 fee = depositAmount / 100 < 100 ? depositAmount / 100 : 100;

        vm.deal(_l1Depositor, depositAmount);
        vm.prank(_l1Depositor);
        rollupProcessor.depositPendingFunds{value: depositAmount}(ethAsset.id, depositAmount, l2Owner, "");
        rollupEncoder.depositL2(ethAsset.id, depositAmount - fee, fee, privKey);

        assertEq(
            rollupProcessor.userPendingDeposits(ethAsset.id, l2Owner),
            depositAmount,
            "pendingDeposit differs from depositAmount"
        );

        assertEq(address(rollupProcessor).balance, depositAmount, "rollupProcessor balance differs from depositAmount");

        rollupEncoder.processRollup();

        assertEq(rollupProcessor.userPendingDeposits(ethAsset.id, l2Owner), 0, "Deposit was not processed");
    }

    function _testShouldDepositERC20AndConvertToNotes(
        AztecTypes.AztecAsset memory _asset,
        address _l1Depositor,
        uint128 _privKey,
        uint96 _depositAmount
    ) internal {
        _acceptableL1Depositor(_l1Depositor);
        ERC20Permit token = ERC20Permit(_asset.erc20Address);
        uint8 decimals = token.decimals();
        uint256 privKey = bound(_privKey, 1, type(uint128).max);
        address l2Owner = vm.addr(privKey);

        uint256 depositUpperLimit =
            rollupProcessor.getCapped() ? _computePendingLimit(_asset.id) : uint256(50 * 10 ** decimals);

        uint256 depositAmount = bound(_depositAmount, uint256(10 ** (decimals - 1)), depositUpperLimit);
        uint256 fee = depositAmount / 100 < 100 ? depositAmount / 100 : 100;

        token.mint(_l1Depositor, depositAmount);

        vm.prank(_l1Depositor);
        token.approve(address(rollupProcessor), type(uint256).max);

        vm.prank(_l1Depositor);
        rollupProcessor.depositPendingFunds(_asset.id, depositAmount, l2Owner, "");
        rollupEncoder.depositL2(_asset.id, depositAmount - fee, fee, privKey);

        assertEq(
            rollupProcessor.userPendingDeposits(_asset.id, l2Owner),
            depositAmount,
            "pendingDeposit differs from depositAmount"
        );

        assertEq(
            token.balanceOf(address(rollupProcessor)),
            depositAmount,
            "rollupProcessor balance differs from depositAmount"
        );

        rollupEncoder.processRollup();

        assertEq(rollupProcessor.userPendingDeposits(_asset.id, l2Owner), 0, "Deposit was not processed");
    }

    function _testShouldDepositFundsViaPermit(
        AztecTypes.AztecAsset memory _asset,
        uint128 _privKey,
        uint96 _depositAmount,
        bool _fromOwner
    ) internal {
        ERC20Permit token = ERC20Permit(_asset.erc20Address);
        uint8 decimals = token.decimals();
        uint256 privKey = bound(_privKey, 1, type(uint128).max);
        address depositor = vm.addr(privKey);
        _acceptableL1Depositor(depositor);
        uint256 depositAmount = bound(_depositAmount, uint256(10 ** (decimals - 1)), uint256(50 * 10 ** decimals));
        uint256 fee = depositAmount / 100 < 100 ? depositAmount / 100 : 100;

        token.mint(depositor, depositAmount);

        // here we are to create a permit instead.
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                token.DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        token.PERMIT_TYPEHASH(),
                        depositor,
                        address(permitHelper),
                        depositAmount,
                        token.nonces(depositor),
                        block.timestamp + 1 hours
                    )
                )
            )
        );

        Sig memory sig;
        (sig.v, sig.r, sig.s) = vm.sign(privKey, digest);

        vm.prank(_fromOwner ? depositor : address(1));
        if (!_fromOwner) {
            vm.expectRevert("INVALID_SIGNATURE");
        }
        permitHelper.depositPendingFundsPermit(
            _asset.id, depositAmount, depositor, block.timestamp + 1 hours, sig.v, sig.r, sig.s
        );
        rollupEncoder.depositL2(_asset.id, depositAmount - fee, fee, privKey);

        if (!_fromOwner) {
            assertEq(
                rollupProcessor.userPendingDeposits(_asset.id, depositor),
                0,
                "pendingDeposit differs from depositAmount"
            );
            assertEq(token.balanceOf(address(rollupProcessor)), 0, "rollupProcessor balance differs from depositAmount");
            return;
        }

        assertEq(
            rollupProcessor.userPendingDeposits(_asset.id, depositor),
            depositAmount,
            "pendingDeposit differs from depositAmount"
        );

        assertEq(
            token.balanceOf(address(rollupProcessor)),
            depositAmount,
            "rollupProcessor balance differs from depositAmount"
        );

        rollupEncoder.processRollup();

        assertEq(rollupProcessor.userPendingDeposits(_asset.id, depositor), 0, "Deposit was not processed");
    }

    function _testShouldDepositFundsViaPermitNonStandard(
        AztecTypes.AztecAsset memory _asset,
        uint128 _privKey,
        uint96 _depositAmount,
        bool _fromOwner
    ) internal {
        ERC20Permit token = ERC20Permit(_asset.erc20Address);
        uint256 privKey = bound(_privKey, 1, type(uint128).max);
        address depositor = vm.addr(privKey);
        _acceptableL1Depositor(depositor);

        uint256 depositAmount;

        {
            uint8 decimals = token.decimals();
            depositAmount = bound(_depositAmount, uint256(10 ** (decimals - 1)), uint256(50 * 10 ** decimals));
        }
        uint256 fee = depositAmount / 100 < 100 ? depositAmount / 100 : 100;

        token.mint(depositor, depositAmount);

        vm.prank(depositor);

        // here we are to create a permit instead.
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                token.DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        token.PERMIT_TYPEHASH_NON_STANDARD(),
                        depositor,
                        address(permitHelper),
                        token.nonces(depositor),
                        block.timestamp + 1 hours,
                        true // allowed
                    )
                )
            )
        );
        Sig memory sig;
        (sig.v, sig.r, sig.s) = vm.sign(privKey, digest);
        uint256 nonce = token.nonces(depositor);

        vm.startPrank(_fromOwner ? depositor : address(1));
        if (!_fromOwner) {
            vm.expectRevert("INVALID_SIGNATURE");
        }
        permitHelper.depositPendingFundsPermitNonStandard(
            _asset.id, depositAmount, depositor, nonce, block.timestamp + 1 hours, sig.v, sig.r, sig.s
        );
        rollupEncoder.depositL2(_asset.id, depositAmount - fee, fee, privKey);

        vm.stopPrank();
        if (!_fromOwner) {
            assertEq(
                rollupProcessor.userPendingDeposits(_asset.id, depositor),
                0,
                "pendingDeposit differs from depositAmount"
            );
            assertEq(token.balanceOf(address(rollupProcessor)), 0, "rollupProcessor balance differs from depositAmount");

            return;
        }

        assertEq(
            rollupProcessor.userPendingDeposits(_asset.id, depositor),
            depositAmount,
            "pendingDeposit differs from depositAmount"
        );

        assertEq(
            token.balanceOf(address(rollupProcessor)),
            depositAmount,
            "rollupProcessor balance differs from depositAmount"
        );

        rollupEncoder.processRollup();

        assertEq(rollupProcessor.userPendingDeposits(_asset.id, depositor), 0, "Deposit was not processed");
    }

    function _acceptableL1Depositor(address _l1Depositor) internal {
        vm.assume(
            _l1Depositor != address(0) && _l1Depositor != address(rollupProcessor)
                && _l1Depositor != address(proxyAdmin)
        );
    }

    function _computePendingLimit(uint256 _assetId) internal view returns (uint256) {
        (,, uint32 pendingCap,, uint8 precision) = rollupProcessor.caps(_assetId);
        return uint256(pendingCap) * 10 ** precision;
    }
}
