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

contract UpgradeV2 is Test {
    error StorageAltered(uint256 index, bytes32 expected, bytes32 actual);

    uint256 internal constant VERSION_BEFORE = 1;
    uint256 internal constant VERSION_AFTER = 2;

    bytes32 internal constant MOCK_KEY_HASH = 0xa81cf1dc6c591dfeea460deaf5ff466cb30eb3705a09d338cab4122236014778;
    bytes32 internal constant PROD_KEY_HASH = 0x231a6b3ded1c9472f543428e5fa1b7dd085d852173f37b4659308745c9e930e6;

    RollupProcessorV2 internal ROLLUP;
    ProxyAdmin internal PROXY_ADMIN;

    function handleMainnet() public {
        ROLLUP = RollupProcessorV2(0xFF1F2B4ADb9dF6FC8eAFecDcbF96A2B351680455);
        PROXY_ADMIN = _getProxyAdmin();

        // Deploy V2
        address implementationV2 = _prepareRollup();
        vm.broadcast();
        Verifier28x32 verifier = new Verifier28x32();

        require(verifier.getVerificationKeyHash() == PROD_KEY_HASH, "Invalid verifier hash");

        emit log("Multisig todo:");
        emit log_named_address("Rollup proxy address     ", address(ROLLUP));
        emit log_named_address("Proxy admin address      ", address(PROXY_ADMIN));
        emit log_named_address("Upgrade implementation to", implementationV2);
        emit log_named_address("Upgrade verifier to      ", address(verifier));
        emit log_named_bytes32("Lister role              ", RollupProcessorV2(implementationV2).LISTER_ROLE());
        emit log_named_bytes32("Resume role              ", RollupProcessorV2(implementationV2).RESUME_ROLE());

        read();
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
        vm.broadcast();
        PROXY_ADMIN.upgradeAndCall(
            TransparentUpgradeableProxy(payable(address(ROLLUP))),
            implementationV2,
            abi.encodeWithSignature("initialize()")
        );

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
        require(MockVerifier(ROLLUP.verifier()).getVerificationKeyHash() == MOCK_KEY_HASH, "Invalid key hash");
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

                bytes32 read = vm.load(address(ROLLUP), bytes32(i));
                if (expected != read) {
                    revert StorageAltered(i, expected, read);
                }
            } else {
                bytes32 read = vm.load(address(ROLLUP), bytes32(i));
                if (values[i] != read) {
                    revert StorageAltered(i, values[i], read);
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

    function _getProxyAdmin() internal returns (ProxyAdmin) {
        address admin = address(
            uint160(
                uint256(vm.load(address(ROLLUP), 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103))
            )
        );
        return ProxyAdmin(admin);
    }
}
