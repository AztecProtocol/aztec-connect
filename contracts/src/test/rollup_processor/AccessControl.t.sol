// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {TestBase} from "../aztec/TestBase.sol";
import {EmptyContract} from "../mocks/EmptyContract.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract AccessControlTest is TestBase {
    address private constant DEFAULT_ADMIN_ROLE_HOLDER = address(0x21);
    address private constant OWNER_ROLE_HOLDER = address(0x22);
    address private constant EMERGENCY_ROLE_HOLDER = address(0x23);
    address private constant LISTER_ROLE_HOLDER = address(0x24);
    address private constant RESUME_ROLE_HOLDER = address(0x25);
    address private constant NO_ROLE_HOLDER = address(0x26);

    address private constant TEST_ADDRESS = address(0x27);
    address private testAddressWithCode;

    bytes32 private defaultAdminRole;
    bytes32 private ownerRole;
    bytes32 private emergencyRole;
    bytes32 private listerRole;
    bytes32 private resumeRole;

    function setUp() public override(TestBase) {
        super.setUp();

        testAddressWithCode = address(new EmptyContract());

        // Set roles to "local" storage for convenience
        defaultAdminRole = rollupProcessor.DEFAULT_ADMIN_ROLE();
        ownerRole = rollupProcessor.OWNER_ROLE();
        emergencyRole = rollupProcessor.EMERGENCY_ROLE();
        listerRole = rollupProcessor.LISTER_ROLE();
        resumeRole = rollupProcessor.RESUME_ROLE();

        // Grant and revoke roles
        rollupProcessor.grantRole(defaultAdminRole, DEFAULT_ADMIN_ROLE_HOLDER);
        rollupProcessor.grantRole(ownerRole, OWNER_ROLE_HOLDER);
        rollupProcessor.grantRole(emergencyRole, EMERGENCY_ROLE_HOLDER);
        rollupProcessor.grantRole(listerRole, LISTER_ROLE_HOLDER);
        rollupProcessor.grantRole(resumeRole, RESUME_ROLE_HOLDER);

        // Revoke all the roles of address(this)/owner
        rollupProcessor.revokeRole(ownerRole, address(this));
        rollupProcessor.revokeRole(emergencyRole, address(this));
        // defaultAdminRole has to be revoked last
        rollupProcessor.revokeRole(defaultAdminRole, address(this));

        // Verify test-relevant state
        assertTrue(
            rollupProcessor.hasRole(defaultAdminRole, DEFAULT_ADMIN_ROLE_HOLDER),
            "defaultAdminRoleHolder doesn't have default admin role"
        );
        assertTrue(rollupProcessor.hasRole(ownerRole, OWNER_ROLE_HOLDER), "ownerRoleHolder doesn't have owner role");
        assertTrue(
            rollupProcessor.hasRole(emergencyRole, EMERGENCY_ROLE_HOLDER),
            "emergencyRoleHolder doesn't have emergency role"
        );
        assertTrue(rollupProcessor.hasRole(listerRole, LISTER_ROLE_HOLDER), "listerRoleHolder doesn't have lister role");
        assertTrue(rollupProcessor.hasRole(resumeRole, RESUME_ROLE_HOLDER), "resumeRoleHolder doesn't have resume role");

        assertFalse(rollupProcessor.paused(), "Rollup processor unexpectedly paused");
        assertFalse(rollupProcessor.allowThirdPartyContracts(), "allowThirdPartyContracts variable unexpectedly true");
    }

    function testEmergencyRoleHolderCanPause() public {
        vm.prank(EMERGENCY_ROLE_HOLDER);
        rollupProcessor.pause();

        assertTrue(rollupProcessor.paused(), "Rollup processor not paused");
    }

    function testEmergencyRoleHolderCantPauseWhenAlreadyPaused() public {
        vm.prank(EMERGENCY_ROLE_HOLDER);
        rollupProcessor.pause();

        assertTrue(rollupProcessor.paused(), "Rollup processor not paused");

        vm.expectRevert(RollupProcessorV2.PAUSED.selector);
        vm.prank(EMERGENCY_ROLE_HOLDER);
        rollupProcessor.pause();
    }

    function testHolderOfOwnerRoleButNotEmergencyCantPause() public {
        vm.prank(OWNER_ROLE_HOLDER);
        vm.expectRevert(_getLackingRoleRevertMessage(OWNER_ROLE_HOLDER, emergencyRole));
        rollupProcessor.pause();

        assertFalse(rollupProcessor.paused(), "Rollup processor unexpectedly paused");
    }

    function testNonHolderOfEmergencyRoleCantPause(address _nonHolder) public {
        vm.assume(_nonHolder != EMERGENCY_ROLE_HOLDER && _nonHolder != address(proxyAdmin));

        vm.prank(_nonHolder);
        vm.expectRevert(_getLackingRoleRevertMessage(_nonHolder, emergencyRole));
        rollupProcessor.pause();

        assertFalse(rollupProcessor.paused(), "Rollup processor unexpectedly paused");
    }

    function testAdminOfEmergencyRoleCanGrantEmergencyRoleAndPause() public {
        vm.prank(DEFAULT_ADMIN_ROLE_HOLDER);
        rollupProcessor.grantRole(emergencyRole, TEST_ADDRESS);

        assertTrue(rollupProcessor.hasRole(emergencyRole, TEST_ADDRESS), "Granting emergency role failed");

        vm.prank(TEST_ADDRESS);
        rollupProcessor.pause();

        assertTrue(rollupProcessor.paused(), "Rollup processor not paused");
    }

    function testAdminOfEmergencyRoleCanRevokeEmergencyRoleAndRevokedCantPause() public {
        vm.prank(DEFAULT_ADMIN_ROLE_HOLDER);
        rollupProcessor.revokeRole(emergencyRole, EMERGENCY_ROLE_HOLDER);

        assertFalse(
            rollupProcessor.hasRole(emergencyRole, EMERGENCY_ROLE_HOLDER),
            "emergencyRoleHolder has emergency role after revoking"
        );

        vm.prank(EMERGENCY_ROLE_HOLDER);
        vm.expectRevert(_getLackingRoleRevertMessage(EMERGENCY_ROLE_HOLDER, emergencyRole));
        rollupProcessor.pause();
    }

    function testHolderOfResumeRoleCanUnpauseWhenPaused() public {
        vm.prank(EMERGENCY_ROLE_HOLDER);
        rollupProcessor.pause();
        assertTrue(rollupProcessor.paused(), "Rollup processor not paused");

        vm.prank(RESUME_ROLE_HOLDER);
        rollupProcessor.unpause();

        assertFalse(rollupProcessor.paused(), "Resuming failed");
    }

    function testHolderOfResumeRoleCannotUnpauseWhenNotPaused() public {
        vm.expectRevert(RollupProcessorV2.NOT_PAUSED.selector);
        vm.prank(RESUME_ROLE_HOLDER);
        rollupProcessor.unpause();
    }

    function testHolderOfEmergencyRoleCannotUnpauseWhenPaused() public {
        vm.prank(EMERGENCY_ROLE_HOLDER);
        rollupProcessor.pause();
        assertTrue(rollupProcessor.paused(), "Rollup processor not paused");

        vm.expectRevert(_getLackingRoleRevertMessage(EMERGENCY_ROLE_HOLDER, resumeRole));
        vm.prank(EMERGENCY_ROLE_HOLDER);
        rollupProcessor.unpause();
    }

    function testHolderOfOnlyOwnerRoleCannotUnpauseWhenPaused() public {
        vm.prank(EMERGENCY_ROLE_HOLDER);
        rollupProcessor.pause();
        assertTrue(rollupProcessor.paused(), "Rollup processor not paused");

        vm.expectRevert(_getLackingRoleRevertMessage(OWNER_ROLE_HOLDER, resumeRole));
        vm.prank(OWNER_ROLE_HOLDER);
        rollupProcessor.unpause();
    }

    function testHolderOfOwnerRoleCanSetRollupProvider() public {
        vm.prank(OWNER_ROLE_HOLDER);
        rollupProcessor.setRollupProvider(TEST_ADDRESS, true);
        assertTrue(rollupProcessor.rollupProviders(TEST_ADDRESS), "Setting rollup provider failed");

        vm.prank(OWNER_ROLE_HOLDER);
        rollupProcessor.setRollupProvider(TEST_ADDRESS, false);
        assertFalse(rollupProcessor.rollupProviders(TEST_ADDRESS), "Removing rollup provider failed");
    }

    function testNonHolderOfOwnerRoleCannotSetRollupProvider(address _nonHolder) public {
        vm.assume(_nonHolder != OWNER_ROLE_HOLDER && _nonHolder != address(proxyAdmin));

        vm.prank(_nonHolder);
        vm.expectRevert(_getLackingRoleRevertMessage(_nonHolder, ownerRole));
        rollupProcessor.setRollupProvider(TEST_ADDRESS, true);

        vm.prank(_nonHolder);
        vm.expectRevert(_getLackingRoleRevertMessage(_nonHolder, ownerRole));
        rollupProcessor.setRollupProvider(TEST_ADDRESS, false);
    }

    function testHolderOfOwnerCanSetVerifier() public {
        vm.prank(OWNER_ROLE_HOLDER);
        rollupProcessor.setVerifier(testAddressWithCode);
        assertEq(rollupProcessor.verifier(), testAddressWithCode, "Setting verifier failed");
    }

    function testNonHolderOfOwnerRoleCannotSetVerifier(address _nonHolder) public {
        vm.assume(_nonHolder != OWNER_ROLE_HOLDER && _nonHolder != address(proxyAdmin));

        vm.prank(_nonHolder);
        vm.expectRevert(_getLackingRoleRevertMessage(_nonHolder, ownerRole));
        rollupProcessor.setVerifier(TEST_ADDRESS);
    }

    function testHolderOfOwnerCanSetAllowThirdPartyContracts() public {
        vm.prank(OWNER_ROLE_HOLDER);
        rollupProcessor.setAllowThirdPartyContracts(true);
        assertTrue(rollupProcessor.allowThirdPartyContracts(), "Setting allowThirdPartyContracts to true failed");

        vm.prank(OWNER_ROLE_HOLDER);
        rollupProcessor.setAllowThirdPartyContracts(false);
        assertFalse(rollupProcessor.allowThirdPartyContracts(), "Setting allowThirdPartyContracts to false failed");
    }

    function testNonHolderOfOwnerRoleCannotSetAllowThirdPartyContracts(address _nonHolder) public {
        vm.assume(_nonHolder != OWNER_ROLE_HOLDER && _nonHolder != address(proxyAdmin));

        vm.prank(_nonHolder);
        vm.expectRevert(_getLackingRoleRevertMessage(_nonHolder, ownerRole));
        rollupProcessor.setAllowThirdPartyContracts(true);
    }

    function testHolderOfOwnerRoleCanSetDefiBridgeProxy() public {
        vm.prank(OWNER_ROLE_HOLDER);
        rollupProcessor.setDefiBridgeProxy(testAddressWithCode);
        assertEq(rollupProcessor.defiBridgeProxy(), testAddressWithCode, "Setting defiBridgeProxy failed");
    }

    function testNonHolderOfOwnerRoleCannotSetDefiBridgeProxy(address _nonHolder) public {
        vm.assume(_nonHolder != OWNER_ROLE_HOLDER && _nonHolder != address(proxyAdmin));

        vm.prank(_nonHolder);
        vm.expectRevert(_getLackingRoleRevertMessage(_nonHolder, ownerRole));
        rollupProcessor.setDefiBridgeProxy(TEST_ADDRESS);
    }

    function testHolderOfListerRoleCanSetSupportedAsset() public {
        uint256 supportedAssetsLengthBefore = rollupProcessor.getSupportedAssetsLength();
        uint256 assetId = supportedAssetsLengthBefore + 1;

        vm.expectEmit(true, true, false, true);
        emit AssetAdded(assetId, testAddressWithCode, 55000);
        vm.prank(LISTER_ROLE_HOLDER);
        rollupProcessor.setSupportedAsset(testAddressWithCode, 55000);

        assertEq(
            rollupProcessor.getSupportedAssetsLength(),
            supportedAssetsLengthBefore + 1,
            "Setting supported asset failed, length"
        );
        assertEq(
            rollupProcessor.getSupportedAsset(assetId), testAddressWithCode, "Setting supported asset failed, address"
        );
        assertEq(rollupProcessor.assetGasLimits(assetId), 55000, "Setting supported asset failed, gas");
    }

    function testHolderOfListerRoleCannotSetSupportedAssetToAddressWithNoCode() public {
        vm.prank(LISTER_ROLE_HOLDER);
        vm.expectRevert(RollupProcessorV2.INVALID_ADDRESS_NO_CODE.selector);
        rollupProcessor.setSupportedAsset(TEST_ADDRESS, 1);
    }

    function testAnyoneCanSetSupportedAssetIfThirdPartyAllowed(address _anyone) public {
        vm.assume(_anyone != address(proxyAdmin));

        vm.prank(OWNER_ROLE_HOLDER);
        rollupProcessor.setAllowThirdPartyContracts(true);
        assertTrue(rollupProcessor.allowThirdPartyContracts(), "Setting allowThirdPartyContracts to true failed");

        uint256 supportedAssetsLengthBefore = rollupProcessor.getSupportedAssetsLength();
        uint256 assetId = supportedAssetsLengthBefore + 1;

        vm.expectEmit(true, true, false, true);
        emit AssetAdded(assetId, testAddressWithCode, 55000);
        vm.prank(_anyone);
        rollupProcessor.setSupportedAsset(testAddressWithCode, 55000);

        assertEq(
            rollupProcessor.getSupportedAssetsLength(),
            supportedAssetsLengthBefore + 1,
            "Setting supported asset failed, length"
        );
        assertEq(
            rollupProcessor.getSupportedAsset(assetId), testAddressWithCode, "Setting supported asset failed, address"
        );
        assertEq(rollupProcessor.assetGasLimits(assetId), 55000, "Setting supported asset failed, gas");
    }

    function testNonHolderOfListerRoleCannotSetSupportedAssetIfThirdPartyNotAllowed(address _nonHolder) public {
        vm.assume(_nonHolder != LISTER_ROLE_HOLDER && _nonHolder != address(proxyAdmin));

        vm.prank(_nonHolder);
        vm.expectRevert(RollupProcessorV2.THIRD_PARTY_CONTRACTS_FLAG_NOT_SET.selector);
        rollupProcessor.setSupportedAsset(TEST_ADDRESS, 1);
    }

    function testHolderOfListerRoleCanSetSupportedBridge() public {
        uint256 supportedBridgesLengthBefore = rollupProcessor.getSupportedBridgesLength();
        uint256 bridgeAddressId = supportedBridgesLengthBefore + 1;

        vm.expectEmit(true, true, false, true);
        emit BridgeAdded(bridgeAddressId, testAddressWithCode, 35000);

        vm.prank(LISTER_ROLE_HOLDER);
        rollupProcessor.setSupportedBridge(testAddressWithCode, 35000);

        assertEq(
            rollupProcessor.getSupportedBridgesLength(),
            supportedBridgesLengthBefore + 1,
            "Setting supported bridge failed, length"
        );
        assertEq(
            rollupProcessor.getSupportedBridge(bridgeAddressId),
            testAddressWithCode,
            "Setting supported bridge failed, address"
        );
        assertEq(rollupProcessor.bridgeGasLimits(bridgeAddressId), 35000, "Setting supported bridge failed, gas");
    }

    function testHolderOfListerRoleCannotSetSupportedBridgeToZero() public {
        vm.prank(LISTER_ROLE_HOLDER);
        vm.expectRevert(RollupProcessorV2.INVALID_ADDRESS_NO_CODE.selector);
        rollupProcessor.setSupportedBridge(address(0), 1);
    }

    function testAnyoneCanSetSupportedBridgeIfThirdPartyAllowed(address _anyone) public {
        vm.assume(_anyone != address(proxyAdmin));

        vm.prank(OWNER_ROLE_HOLDER);
        rollupProcessor.setAllowThirdPartyContracts(true);
        assertTrue(rollupProcessor.allowThirdPartyContracts(), "Setting allowThirdPartyContracts to true failed");

        uint256 supportedBridgesLengthBefore = rollupProcessor.getSupportedBridgesLength();
        uint256 bridgeAddressId = supportedBridgesLengthBefore + 1;

        vm.expectEmit(true, true, false, true);
        emit BridgeAdded(bridgeAddressId, testAddressWithCode, 35000);
        vm.prank(_anyone);
        rollupProcessor.setSupportedBridge(testAddressWithCode, 35000);

        assertEq(
            rollupProcessor.getSupportedBridgesLength(),
            supportedBridgesLengthBefore + 1,
            "Setting supported bridge failed, length"
        );
        assertEq(
            rollupProcessor.getSupportedBridge(bridgeAddressId),
            testAddressWithCode,
            "Setting supported bridge failed, address"
        );
        assertEq(rollupProcessor.bridgeGasLimits(bridgeAddressId), 35000, "Setting supported bridge failed, gas");
    }

    function testNonHolderOfListerRoleCannotSetSupportedBridgeIfThirdPartyNotAllowed(address _nonHolder) public {
        vm.assume(_nonHolder != LISTER_ROLE_HOLDER && _nonHolder != address(proxyAdmin));

        vm.prank(_nonHolder);
        vm.expectRevert(RollupProcessorV2.THIRD_PARTY_CONTRACTS_FLAG_NOT_SET.selector);
        rollupProcessor.setSupportedBridge(TEST_ADDRESS, 1);
    }

    function testNonHolderOfDefaultAdminRoleCannotAddPeopleToRoles(address _nonHolder) public {
        vm.assume(_nonHolder != DEFAULT_ADMIN_ROLE_HOLDER && _nonHolder != address(proxyAdmin));

        vm.prank(_nonHolder);
        vm.expectRevert(_getLackingRoleRevertMessage(_nonHolder, defaultAdminRole));
        rollupProcessor.grantRole(emergencyRole, TEST_ADDRESS);
    }

    function testHolderOfDefaultAdminRoleAddsNewAdminWhoUpdatesRoles() public {
        vm.prank(DEFAULT_ADMIN_ROLE_HOLDER);
        rollupProcessor.grantRole(defaultAdminRole, NO_ROLE_HOLDER);
        assertTrue(rollupProcessor.hasRole(defaultAdminRole, NO_ROLE_HOLDER), "granting defaultAdminRole failed");

        address newAdmin = NO_ROLE_HOLDER;

        vm.startPrank(newAdmin);

        // Revoke old roles
        rollupProcessor.revokeRole(defaultAdminRole, DEFAULT_ADMIN_ROLE_HOLDER);
        rollupProcessor.revokeRole(ownerRole, OWNER_ROLE_HOLDER);
        rollupProcessor.revokeRole(emergencyRole, EMERGENCY_ROLE_HOLDER);

        // Add new roles to self
        rollupProcessor.grantRole(ownerRole, newAdmin);
        rollupProcessor.grantRole(emergencyRole, newAdmin);

        vm.stopPrank();

        // Verify results
        assertFalse(
            rollupProcessor.hasRole(defaultAdminRole, DEFAULT_ADMIN_ROLE_HOLDER), "revoking defaultAdminRole failed"
        );
        assertFalse(rollupProcessor.hasRole(ownerRole, OWNER_ROLE_HOLDER), "revoking ownerRole failed");
        assertFalse(rollupProcessor.hasRole(emergencyRole, EMERGENCY_ROLE_HOLDER), "revoking emergencyRole failed");
        assertTrue(rollupProcessor.hasRole(ownerRole, newAdmin), "granting ownerRole failed");
        assertTrue(rollupProcessor.hasRole(emergencyRole, newAdmin), "granting emergencyRole failed");
    }

    function testNonOwnerOfPermitHelperCannotKillIt(address _nonOwner) public {
        vm.assume(permitHelper.owner() != _nonOwner);

        assertEq(
            address(permitHelper.ROLLUP_PROCESSOR()),
            address(rollupProcessor),
            "RollupProcessor address differs from the expected one"
        );

        vm.expectRevert("Ownable: caller is not the owner");
        vm.prank(_nonOwner);
        permitHelper.kill();
    }

    function testEscapeHatchCorrectlyOpens() public {
        uint256 expectedBlocksRemaining =
            rollupProcessor.escapeBlockUpperBound() - rollupProcessor.escapeBlockLowerBound();

        // Make escape hatch active
        vm.roll(rollupProcessor.escapeBlockLowerBound());

        (bool hatchOpen, uint256 blocksRemaining) = rollupProcessor.getEscapeHatchStatus();

        assertTrue(hatchOpen, "escape hatch closed");
        assertEq(blocksRemaining, expectedBlocksRemaining, "incorrect num blocks remaining");
    }

    function testEscapeHatchCorrectlyCloses() public {
        // Make escape hatch active
        vm.roll(rollupProcessor.escapeBlockUpperBound());

        (bool hatchOpen, uint256 blocksRemaining) = rollupProcessor.getEscapeHatchStatus();

        assertFalse(hatchOpen, "escape hatch open");
    }

    function testAnyoneCanUseEscapeHatch(address _anyone) public {
        vm.assume(_anyone != address(proxyAdmin));

        // Make escape hatch active
        vm.roll(rollupProcessor.escapeBlockLowerBound());
        (bool hatchOpen,) = rollupProcessor.getEscapeHatchStatus();
        assertTrue(hatchOpen, "escape hatch closed");

        // Create withdrawal to avoid revert due to empty rollup batch
        _createWithdrawal();

        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();

        vm.prank(_anyone);
        rollupProcessor.processRollup(encodedProofData, signatures);
    }

    function testRevertsWhenNonProviderSubmitsABatchOutOfEscapeHatch(address _nonProvider) public {
        vm.assume(_nonProvider != address(proxyAdmin) && _nonProvider != ROLLUP_PROVIDER);

        // Create withdrawal to avoid revert due to empty rollup batch
        _createWithdrawal();

        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();

        vm.expectRevert(RollupProcessorV2.INVALID_PROVIDER.selector);
        vm.prank(_nonProvider);
        rollupProcessor.processRollup(encodedProofData, signatures);
    }

    function testRevertsWhenNonProviderSubmitsABatchDuringEscapeHatchBeforeDelayPassed(address _nonProvider) public {
        vm.assume(_nonProvider != address(proxyAdmin) && _nonProvider != ROLLUP_PROVIDER);

        // Make escape hatch active
        vm.roll(rollupProcessor.escapeBlockLowerBound());
        (bool hatchOpen,) = rollupProcessor.getEscapeHatchStatus();
        assertTrue(hatchOpen, "escape hatch closed");

        vm.prank(OWNER_ROLE_HOLDER);
        rollupProcessor.setDelayBeforeEscapeHatch(1000);

        // Create withdrawal to avoid revert due to empty rollup batch
        _createWithdrawal();

        (bytes memory encodedProofData, bytes memory signatures) = rollupEncoder.prepProcessorAndGetRollupBlock();

        vm.expectRevert(RollupProcessorV2.INVALID_PROVIDER.selector);
        vm.prank(_nonProvider);
        rollupProcessor.processRollup(encodedProofData, signatures);
    }

    function _createWithdrawal() private {
        uint256 withdrawAmount = 1 ether;
        deal(address(rollupProcessor), withdrawAmount);
        rollupEncoder.withdrawL2(0, withdrawAmount, TEST_ADDRESS);
    }

    function _getLackingRoleRevertMessage(address _account, bytes32 _role) private pure returns (bytes memory) {
        return abi.encodePacked(
            "AccessControl: account ",
            Strings.toHexString(uint256(uint160(_account)), 20),
            " is missing role ",
            Strings.toHexString(uint256(_role), 32)
        );
    }
}
