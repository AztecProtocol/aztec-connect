// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {Vm} from "forge-std/Test.sol";
import {RollupProcessor} from "core/processors/RollupProcessor.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {RollupProcessorVPlus1} from "../mocks/RollupProcessorVPlus1.sol";

contract UpgradeableTest is TestBase {
    TransparentUpgradeableProxy private proxy;
    RollupProcessorV2 private implementation;

    function setUp() public override(TestBase) {
        super.setUp();

        proxy = TransparentUpgradeableProxy(payable(address(rollupProcessor)));
        implementation = RollupProcessorV2(proxyAdmin.getProxyImplementation(proxy));
    }

    function testImplementationVars() public {
        assertEq(implementation.defiBridgeProxy(), address(0), "Incorrect defiBridgeProxy");
        assertEq(implementation.verifier(), address(0), "Incorrect verifier");
        assertEq(implementation.prevDefiInteractionsHash(), bytes32(0), "Incorrect prevDefiInteractionsHash");
        assertEq(implementation.rollupStateHash(), bytes32(0), "Incorrect rollupStateHash");
        assertEq(implementation.escapeBlockLowerBound(), 80, "Incorrect escapeBlockLowerBound");
        assertEq(implementation.escapeBlockUpperBound(), 100, "Incorrect escapeBlockUpperBound");
        assertFalse(implementation.allowThirdPartyContracts(), "Incorrect allowThirdPartyContracts");
    }

    function testRevertsWhenDepositingDirectlyImplementation() public {
        uint256 assetId = 0; // ETH
        uint256 depositAmount = 1 ether;
        address depositor = address(0x21);

        vm.deal(depositor, depositAmount);

        vm.prank(depositor);
        vm.expectRevert(RollupProcessorV2.PAUSED.selector);
        implementation.depositPendingFunds{value: depositAmount}(assetId, depositAmount, depositor, "");
    }

    function testRevertsWhenTryingToInitializeImplementation() public {
        vm.expectRevert("Initializable: contract is already initialized");
        implementation.initialize();
    }

    function testProxyAdminHasOwnerRole() public {
        assertTrue(
            rollupProcessor.hasRole(rollupProcessor.OWNER_ROLE(), proxyAdmin.owner()),
            "proxyAdmin owner lacks owner role"
        );
    }

    // @dev Deploys RollupProcessorV2 one more time and checks that re-initialization fails
    function testRevertsWhenInitializingWithSameImplVersion() public {
        RollupProcessorV2 newImpl = new RollupProcessorV2(80, 100);

        vm.prank(proxyAdmin.owner());
        vm.expectRevert("Initializable: contract is already initialized");
        proxyAdmin.upgradeAndCall(proxy, address(newImpl), abi.encodeWithSignature("initialize()"));
    }

    // @dev Deploys RollupProcessor v1 one more time and checks that re-initialization fails
    function testRevertsWhenInitializingWithLowerImplVersion() public {
        RollupProcessor newImpl = new RollupProcessor(80, 100);

        bytes memory initializeCalldata = abi.encodeWithSignature(
            "initialize(address,address,address,bytes32,bytes32,bytes32,uint32,bool)",
            address(0),
            address(0),
            address(0),
            bytes32(0),
            bytes32(0),
            bytes32(0),
            0,
            false
        );

        vm.prank(proxyAdmin.owner());
        vm.expectRevert("Initializable: contract is already initialized");
        proxyAdmin.upgradeAndCall(proxy, address(newImpl), initializeCalldata);
    }

    function testRevertsWhenTryingToReinitialize() public {
        vm.expectRevert("Initializable: contract is already initialized");
        rollupProcessor.initialize();
    }

    function testNewProxyAdminOwnerCanUpgrade() public {
        address newAdminOwner = address(0x20);

        vm.prank(proxyAdmin.owner());
        proxyAdmin.transferOwnership(newAdminOwner);
        assertEq(proxyAdmin.owner(), newAdminOwner, "proxyAdmin ownership transfer failed");

        RollupProcessorVPlus1 newImpl = new RollupProcessorVPlus1();

        vm.prank(newAdminOwner);
        proxyAdmin.upgradeAndCall(proxy, address(newImpl), abi.encodeWithSignature("initialize()"));
    }

    /**
     * @dev Checking that initialization doesn't change role holders is valuable because it ensures that nobody can
     *      steal the proxy in case we accidentaly forget to call initialize() after upgrade.
     */
    function testNewProcessorVersionInitializationDoesNotChangeRoleHolders() public {
        RollupProcessorVPlus1 newImpl = new RollupProcessorVPlus1();

        bytes32[] memory forbiddenTopics = new bytes32[](3);
        forbiddenTopics[0] = keccak256("RoleAdminChanged(bytes32,bytes32,bytes32)");
        forbiddenTopics[1] = keccak256("RoleGranted(bytes32,address,address)");
        forbiddenTopics[2] = keccak256("RoleRevoked(bytes32,address,address)");

        vm.recordLogs();

        vm.prank(proxyAdmin.owner());
        proxyAdmin.upgradeAndCall(proxy, address(newImpl), abi.encodeWithSignature("initialize()"));

        Vm.Log[] memory logs = vm.getRecordedLogs();

        for (uint256 i = 0; i < logs.length; i++) {
            for (uint256 j = 0; j < forbiddenTopics.length; j++) {
                assertFalse(logs[i].topics[0] == forbiddenTopics[j], "Forbidden topic found");
            }
        }
    }
}
