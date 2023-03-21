// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Test} from "forge-std/Test.sol";

import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import {IRollupProcessor} from "rollup-encoder/interfaces/IRollupProcessor.sol";
import {RollupProcessor} from "core/processors/RollupProcessor.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {RollupProcessorV2Reference as refV2} from "core/reference/RollupProcessorV2Reference.sol";
import {DefiBridgeProxy} from "core/DefiBridgeProxy.sol";
import {PermitHelper} from "periphery/PermitHelper.sol";
import {ProxyDeployer} from "periphery/ProxyDeployer.sol";

contract RollupDeployer is Test {
    bytes32 private constant VANITY_SALT = bytes32(bytes("Aztec Connect"));

    bool private isDeploying = false;

    struct DeployParams {
        address verifier;
        address contractOwner;
        uint256 escapeBlockLowerBound;
        uint256 escapeBlockUpperBound;
        bytes32 initDataRoot;
        bytes32 initNullRoot;
        bytes32 initRootRoot;
        uint32 initDataSize;
        bool allowThirdPartyContract;
    }

    function setIsDeploying(bool _isDeploying) public {
        isDeploying = _isDeploying;
    }

    function deploy(DeployParams memory _params) public returns (address, address, address, address, address) {
        if (isDeploying) vm.broadcast();
        DefiBridgeProxy defiBridgeProxy = new DefiBridgeProxy();

        bytes memory initializeCalldata = abi.encodeWithSignature(
            "initialize(address,address,address,bytes32,bytes32,bytes32,uint32,bool)",
            _params.verifier,
            defiBridgeProxy,
            _params.contractOwner,
            _params.initDataRoot,
            _params.initNullRoot,
            _params.initRootRoot,
            _params.initDataSize,
            _params.allowThirdPartyContract
        );

        if (isDeploying) vm.startBroadcast();
        RollupProcessor rollupProcessorV1 = new RollupProcessor(
            _params.escapeBlockLowerBound,
            _params.escapeBlockUpperBound
        );

        ProxyAdmin proxyAdmin = new ProxyAdmin();

        ProxyDeployer proxyDeployer = new ProxyDeployer();

        TransparentUpgradeableProxy proxy = TransparentUpgradeableProxy(
            payable(
                proxyDeployer.deployProxy(
                    address(rollupProcessorV1), address(proxyAdmin), initializeCalldata, VANITY_SALT
                )
            )
        );

        PermitHelper permitHelper = new PermitHelper(IRollupProcessor(address(proxy)));

        if (isDeploying) vm.stopBroadcast();

        if (proxyAdmin.getProxyImplementation(proxy) != address(rollupProcessorV1)) revert("Incorrect implementation");

        vm.expectRevert("Initializable: contract is already initialized");
        (bool success,) = address(rollupProcessorV1).call(initializeCalldata);
        if (!success) revert("Already initialised"); // success inverted due to `expectRevert` cheatcode

        if (proxyAdmin.owner() != _params.contractOwner) {
            if (isDeploying) vm.broadcast();
            proxyAdmin.transferOwnership(_params.contractOwner);
            assertEq(proxyAdmin.owner(), _params.contractOwner, "proxyAdmin ownership transfer failed");
        }

        return (
            address(proxyAdmin), address(proxy), address(permitHelper), address(proxyDeployer), address(defiBridgeProxy)
        );
    }

    function upgrade(address _proxyAdmin, address _proxy) public {
        ProxyAdmin proxyAdmin = ProxyAdmin(_proxyAdmin);
        RollupProcessor old = RollupProcessor(_proxy);
        TransparentUpgradeableProxy proxy = TransparentUpgradeableProxy(payable(_proxy));

        uint256 lower = old.escapeBlockLowerBound();
        uint256 upper = old.escapeBlockUpperBound();

        RollupProcessorV2 rollupProcessorV2;
        if (isDeploying) vm.broadcast();
        if (vm.envOr("REFERENCE", false)) {
            rollupProcessorV2 = RollupProcessorV2(address(new refV2(lower, upper)));
        } else {
            rollupProcessorV2 = new RollupProcessorV2(lower, upper);
        }

        vm.expectRevert("Initializable: contract is already initialized");
        rollupProcessorV2.initialize();

        if (isDeploying) vm.broadcast();
        if (!isDeploying) vm.prank(proxyAdmin.owner());
        proxyAdmin.upgradeAndCall(proxy, address(rollupProcessorV2), abi.encodeWithSignature("initialize()"));

        if (proxyAdmin.getProxyImplementation(proxy) != address(rollupProcessorV2)) revert("Incorrect implementation");
    }
}
