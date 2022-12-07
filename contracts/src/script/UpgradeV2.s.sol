// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Test} from "forge-std/Test.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import {PermitHelper} from "periphery/PermitHelper.sol";
import {IRollupProcessor} from "rollup-encoder/interfaces/IRollupProcessor.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";

import {MockVerifier} from "core/verifier/instances/MockVerifier.sol";
import {Verifier28x32} from "core/verifier/instances/Verifier28x32.sol";
import {IVerifier} from "core/interfaces/IVerifier.sol";

contract UpgradeV2 is Test {
    error StorageAltered(uint256 index, bytes32 expected, bytes32 actual);

    uint256 internal constant VERSION_BEFORE = 1;
    uint256 internal constant VERSION_AFTER = 2;

    bytes32 internal constant MOCK_KEY_HASH = 0xe93606306cfda92d3e8937e91d4467ecb74c7092eb49e932be66a2f488ca7003;
    bytes32 internal constant PROD_KEY_HASH = 0x8bb8dcfd02060143443271408d47991c82c9fd631b02b42ef1ec28909631b9a1;

    address internal constant LISTER = 0x68A36Aa8E309d5010ab4F9D6c5F1246b854D0b9e;
    address internal constant RESUME = 0x62415C92528C7d86Fd3f82D3fc75c2F66Bb9389a;

    RollupProcessorV2 internal ROLLUP;
    ProxyAdmin internal PROXY_ADMIN;

    bool internal constant RUN_MAINNET_SIM = true;

    function handleMainnet() public {
        ROLLUP = RollupProcessorV2(0xFF1F2B4ADb9dF6FC8eAFecDcbF96A2B351680455);
        PROXY_ADMIN = _getProxyAdmin();

        // Deploy V2
        address implementationV2 = _prepareRollup();
        vm.broadcast();
        Verifier28x32 verifier = new Verifier28x32();

        require(verifier.getVerificationKeyHash() == PROD_KEY_HASH, "Invalid verifier hash");

        bytes memory upgradeCalldata = abi.encodeWithSignature(
            "upgradeAndCall(address,address,bytes)",
            TransparentUpgradeableProxy(payable(address(ROLLUP))),
            implementationV2,
            abi.encodeWithSignature("initialize()")
        );

        bytes memory updateVerifierCalldata = abi.encodeWithSignature("setVerifier(address)", address(verifier));

        bytes32 LISTER_ROLE = RollupProcessorV2(implementationV2).LISTER_ROLE();
        bytes32 RESUME_ROLE = RollupProcessorV2(implementationV2).RESUME_ROLE();

        emit log_named_address("Rollup proxy address     ", address(ROLLUP));
        emit log_named_address("Proxy admin address      ", address(PROXY_ADMIN));
        emit log_named_address("Verifier address         ", address(verifier));
        emit log("####");
        emit log("Multisig todo:");

        emit log("Upgrade implementation");
        emit log_named_address("\tCall    ", address(PROXY_ADMIN));
        emit log_named_bytes("\tCalldata", upgradeCalldata);

        emit log("Update verifier");
        emit log_named_address("\tCall    ", address(ROLLUP));
        emit log_named_bytes("\tCalldata", updateVerifierCalldata);

        emit log("Add lister");
        emit log_named_address("\tCall    ", address(ROLLUP));
        emit log_named_bytes("\tCalldata", abi.encodeWithSignature("grantRole(bytes32,address)", LISTER_ROLE, LISTER));

        emit log("Add resume");
        emit log_named_address("\tCall    ", address(ROLLUP));
        emit log_named_bytes("\tCalldata", abi.encodeWithSignature("grantRole(bytes32,address)", RESUME_ROLE, RESUME));

        emit log("Status");

        read();

        if (RUN_MAINNET_SIM) {
            emit log("Simulating upgrade");
            // Load storage values from implementation. Skip initialising (_initialized, _initializing)
            bytes32[] memory values = new bytes32[](25);
            for (uint256 i = 1; i < 25; i++) {
                values[i] = vm.load(address(ROLLUP), bytes32(i));
            }
            address bridgeProxy = ROLLUP.defiBridgeProxy();
            uint256 gasLimit = ROLLUP.bridgeGasLimits(1);
            bytes32 prevDefiInteractionsHash = ROLLUP.prevDefiInteractionsHash();
            // Simulate a deposit of ether setting the proof approval
            ROLLUP.depositPendingFunds{value: 1 ether}(0, 1 ether, address(this), bytes32("dead"));

            vm.startPrank(PROXY_ADMIN.owner());
            (bool success,) = address(PROXY_ADMIN).call(upgradeCalldata);
            require(success, "Upgrade call failed");
            (success,) = address(ROLLUP).call(updateVerifierCalldata);
            require(success, "Update verifier call failed");
            (success,) =
                address(ROLLUP).call(abi.encodeWithSignature("grantRole(bytes32,address)", LISTER_ROLE, LISTER));
            require(success, "Add lister call failed");
            (success,) =
                address(ROLLUP).call(abi.encodeWithSignature("grantRole(bytes32,address)", RESUME_ROLE, RESUME));
            require(success, "Add resume call failed");
            vm.stopPrank();

            // Checks
            require(IVerifier(ROLLUP.verifier()).getVerificationKeyHash() == PROD_KEY_HASH, "Invalid key hash");
            require(ROLLUP.getImplementationVersion() == VERSION_AFTER, "Version after don't match");
            require(
                PROXY_ADMIN.getProxyImplementation(TransparentUpgradeableProxy(payable(address(ROLLUP))))
                    == implementationV2,
                "Implementation address not matching"
            );
            require(ROLLUP.hasRole(LISTER_ROLE, LISTER), "Not lister");
            require(ROLLUP.hasRole(RESUME_ROLE, RESUME), "Not resume");

            // check that existing storage is unaltered or altered as planned
            for (uint256 i = 1; i < 17; i++) {
                if (i == 2) {
                    // The rollup state must have changed to set the `capped` flag and new verifier
                    bytes32 expected = bytes32(uint256(values[i]) | uint256(1 << 240));
                    expected = bytes32((uint256(expected >> 160) << 160) | uint160(address(verifier)));

                    bytes32 readSlot = vm.load(address(ROLLUP), bytes32(i));
                    if (expected != readSlot) {
                        revert StorageAltered(i, expected, readSlot);
                    }
                } else {
                    bytes32 readSlot = vm.load(address(ROLLUP), bytes32(i));
                    if (values[i] != readSlot) {
                        revert StorageAltered(i, values[i], readSlot);
                    }
                }
            }
            require(ROLLUP.depositProofApprovals(address(this), bytes32("dead")), "Approval altered");
            require(ROLLUP.userPendingDeposits(0, address(this)) == 1 ether, "Pending amount altered");
            require(ROLLUP.defiBridgeProxy() == bridgeProxy, "Invalid bridgeProxy");
            require(ROLLUP.bridgeGasLimits(1) == gasLimit, "Invalid bridge gas limit");
            require(ROLLUP.prevDefiInteractionsHash() == prevDefiInteractionsHash, "Invalid prevDefiInteractionsHash");

            emit log("Upgrade to V2 successful");
            read();
        }
    }

    function handleDevnet() public {
        handleAsAdmin(0xb158f0Fb0312622A7F87D0CBC060221C54D1e82E);
    }

    function handleTestnet() public {
        handleAsAdmin(0x614957a8aE7B87f18fa3f207b6619C520A022b4F);
    }

    function handleAsAdmin(address _rollup) public {
        ROLLUP = RollupProcessorV2(_rollup);
        PROXY_ADMIN = _getProxyAdmin();

        // Load storage values from implementation. Skip initialising (_initialized, _initializing)
        bytes32[] memory values = new bytes32[](25);
        for (uint256 i = 1; i < 25; i++) {
            values[i] = vm.load(address(ROLLUP), bytes32(i));
        }
        address bridgeProxy = ROLLUP.defiBridgeProxy();
        uint256 gasLimit = ROLLUP.bridgeGasLimits(1);
        bytes32 prevDefiInteractionsHash = ROLLUP.prevDefiInteractionsHash();
        // Simulate a deposit of ether setting the proof approval
        ROLLUP.depositPendingFunds{value: 1 ether}(0, 1 ether, address(this), bytes32("dead"));

        // Deploy V2
        address implementationV2 = _prepareRollup();

        // Deploy new verifier and check hash
        vm.broadcast();
        MockVerifier verifier = new MockVerifier();

        // Upgrade to new implementation
        bytes memory upgradeCalldata = abi.encodeWithSignature(
            "upgradeAndCall(address,address,bytes)",
            TransparentUpgradeableProxy(payable(address(ROLLUP))),
            implementationV2,
            abi.encodeWithSignature("initialize()")
        );
        vm.broadcast();
        (bool success,) = address(PROXY_ADMIN).call(upgradeCalldata);
        require(success, "Upgrade call failed");

        // Update verifier
        vm.broadcast();
        ROLLUP.setVerifier(address(verifier));

        // Update roles
        bytes32 lister = ROLLUP.LISTER_ROLE();
        bytes32 resume = ROLLUP.RESUME_ROLE();
        vm.startBroadcast();
        ROLLUP.grantRole(lister, tx.origin);
        ROLLUP.grantRole(resume, tx.origin);
        vm.stopBroadcast();

        // Checks
        require(IVerifier(ROLLUP.verifier()).getVerificationKeyHash() == MOCK_KEY_HASH, "Invalid key hash");
        require(ROLLUP.getImplementationVersion() == VERSION_AFTER, "Version after don't match");
        require(
            PROXY_ADMIN.getProxyImplementation(TransparentUpgradeableProxy(payable(address(ROLLUP))))
                == implementationV2,
            "Implementation address not matching"
        );
        require(ROLLUP.hasRole(lister, tx.origin), "Not lister");
        require(ROLLUP.hasRole(resume, tx.origin), "Not resume");

        // check that existing storage is unaltered or altered as planned
        for (uint256 i = 1; i < 17; i++) {
            if (i == 2) {
                // The rollup state must have changed to set the `capped` flag and new verifier
                bytes32 expected = bytes32(uint256(values[i]) | uint256(1 << 240));
                expected = bytes32((uint256(expected >> 160) << 160) | uint160(address(verifier)));

                bytes32 readSlot = vm.load(address(ROLLUP), bytes32(i));
                if (expected != readSlot) {
                    revert StorageAltered(i, expected, readSlot);
                }
            } else {
                bytes32 readSlot = vm.load(address(ROLLUP), bytes32(i));
                if (values[i] != readSlot) {
                    revert StorageAltered(i, values[i], readSlot);
                }
            }
        }
        require(ROLLUP.depositProofApprovals(address(this), bytes32("dead")), "Approval altered");
        require(ROLLUP.userPendingDeposits(0, address(this)) == 1 ether, "Pending amount altered");
        require(ROLLUP.defiBridgeProxy() == bridgeProxy, "Invalid bridgeProxy");
        require(ROLLUP.bridgeGasLimits(1) == gasLimit, "Invalid bridge gas limit");
        require(ROLLUP.prevDefiInteractionsHash() == prevDefiInteractionsHash, "Invalid prevDefiInteractionsHash");

        emit log("Upgrade to V2 successful");

        read();
    }

    function read() public {
        emit log_named_address("ROLLUP                     ", address(ROLLUP));
        emit log_named_uint("Implementation version     ", ROLLUP.getImplementationVersion());
        emit log_named_bytes32("Rollup state hash          ", ROLLUP.rollupStateHash());
        emit log_named_uint("Number of bridges          ", ROLLUP.getSupportedBridgesLength());
        emit log_named_address("Owner of proxy admin       ", PROXY_ADMIN.owner());
        emit log_named_address(
            "Implementation address     ",
            PROXY_ADMIN.getProxyImplementation(TransparentUpgradeableProxy(payable(address(ROLLUP))))
            );
    }

    function _prepareRollup() internal returns (address) {
        require(ROLLUP.getImplementationVersion() == VERSION_BEFORE, "Version before don't match");

        uint256 lowerBound = ROLLUP.escapeBlockLowerBound();
        uint256 upperBound = ROLLUP.escapeBlockUpperBound();

        vm.broadcast();
        RollupProcessorV2 fix = new RollupProcessorV2(lowerBound, upperBound);

        vm.expectRevert("Initializable: contract is already initialized");
        fix.initialize();

        require(fix.getImplementationVersion() == VERSION_AFTER, "Fix Version not matching");

        return address(fix);
    }

    function _getProxyAdmin() internal view returns (ProxyAdmin) {
        address admin = address(
            uint160(
                uint256(vm.load(address(ROLLUP), 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103))
            )
        );
        return ProxyAdmin(admin);
    }
}
