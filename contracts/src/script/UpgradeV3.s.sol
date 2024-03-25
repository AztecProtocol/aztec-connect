// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Test} from "forge-std/Test.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import {PermitHelper} from "periphery/PermitHelper.sol";
import {IRollupProcessor} from "rollup-encoder/interfaces/IRollupProcessor.sol";
import {RollupProcessorV3} from "core/processors/RollupProcessorV3.sol";

import {MockVerifier} from "core/verifier/instances/MockVerifier.sol";
import {Verifier28x32 as Verifier} from "core/verifier/instances/Verifier28x32.sol";
import {IVerifier} from "core/interfaces/IVerifier.sol";

contract UpgradeV3 is Test {
    uint256 internal constant VERSION_BEFORE = 2;
    uint256 internal constant VERSION_AFTER = 3;
    bytes32 internal constant PROD_KEY_HASH = 0x58ef3faae858309785d95440f2ae3192ad9e3a640d7d078a48f5200acd68dabd;

    RollupProcessorV3 internal ROLLUP;
    ProxyAdmin internal PROXY_ADMIN;

    function run() public {
        ROLLUP = RollupProcessorV3(0xFF1F2B4ADb9dF6FC8eAFecDcbF96A2B351680455);
        PROXY_ADMIN = _getProxyAdmin();

        // Deploy V3
        address implementationV3 = _prepareRollup();
        vm.broadcast();
        Verifier verifier = new Verifier();

        require(verifier.getVerificationKeyHash() == PROD_KEY_HASH, "Invalid verifier hash");

        bytes memory upgradeCalldata = abi.encodeWithSignature(
            "upgradeAndCall(address,address,bytes)",
            TransparentUpgradeableProxy(payable(address(ROLLUP))),
            implementationV3,
            abi.encodeWithSignature("initialize()")
        );

        bytes memory updateVerifierCalldata = abi.encodeWithSignature("setVerifier(address)", address(verifier));

        // bytes32 LISTER_ROLE = RollupProcessorV3(implementationV3).LISTER_ROLE();
        // bytes32 RESUME_ROLE = RollupProcessorV3(implementationV3).RESUME_ROLE();

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
        emit log("Status");

        read();

        emit log("Simulating upgrade");

        // vm.prank(PROXY_ADMIN.owner());
        vm.broadcast();
        (bool success,) = address(PROXY_ADMIN).call(upgradeCalldata);
        require(success, "Upgrade call failed");
        vm.broadcast();
        (success,) = address(ROLLUP).call(updateVerifierCalldata);
        require(success, "Update verifier call failed");
        // vm.stopPrank();

        // Checks
        require(IVerifier(ROLLUP.verifier()).getVerificationKeyHash() == PROD_KEY_HASH, "Invalid key hash");
        require(ROLLUP.getImplementationVersion() == VERSION_AFTER, "Version after don't match");
        require(
            PROXY_ADMIN.getProxyImplementation(TransparentUpgradeableProxy(payable(address(ROLLUP))))
                == implementationV3,
            "Implementation address not matching"
        );

        emit log("Upgrade to V3 successful");

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
        emit log_named_bytes32("Vkhash       ", IVerifier(ROLLUP.verifier()).getVerificationKeyHash());
    }

    function _prepareRollup() internal returns (address) {
        require(ROLLUP.getImplementationVersion() == VERSION_BEFORE, "Version before don't match");

        uint256 lowerBound = ROLLUP.escapeBlockLowerBound();
        uint256 upperBound = ROLLUP.escapeBlockUpperBound();

        vm.broadcast();
        RollupProcessorV3 fix = new RollupProcessorV3(lowerBound, upperBound);

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
