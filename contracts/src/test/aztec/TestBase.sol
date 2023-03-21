// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Test} from "forge-std/Test.sol";

import {RollupProcessor} from "core/processors/RollupProcessor.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {DefiBridgeProxy} from "core/DefiBridgeProxy.sol";
import {PermitHelper} from "periphery/PermitHelper.sol";
import {ProxyDeployer} from "periphery/ProxyDeployer.sol";
import {RollupEncoder} from "rollup-encoder/RollupEncoder.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import {AlwaysTrueVerifier} from "../mocks/AlwaysTrueVerifier.sol";
import {RollupDeployer} from "../../script/deployments/RollupDeployer.s.sol";

/**
 * @dev Bootstraps the test environment for all tests.
 */
abstract contract TestBase is Test {
    // Events copied from RollupProcessor for testing purposes
    event AssetAdded(uint256 indexed assetId, address indexed assetAddress, uint256 assetGasLimit);
    event BridgeAdded(uint256 indexed bridgeAddressId, address indexed bridgeAddress, uint256 bridgeGasLimit);
    event RollupProcessed(uint256 indexed rollupId, bytes32[] nextExpectedDefiHashes, address sender);
    event DefiBridgeProcessed(
        uint256 indexed encodedBridgeCallData,
        uint256 indexed nonce,
        uint256 totalInputValue,
        uint256 totalOutputValueA,
        uint256 totalOutputValueB,
        bool result,
        bytes errorReason
    );
    event AsyncDefiBridgeProcessed(
        uint256 indexed encodedBridgeCallData, uint256 indexed nonce, uint256 totalInputValue
    );
    event AssetCapUpdated(uint256 assetId, uint256 pendingCap, uint256 dailyCap);

    address internal constant ROLLUP_PROVIDER = payable(0xA173BDdF4953C1E8be2cA0695CFc07502Ff3B1e7);

    bytes32 private constant INIT_DATA_ROOT = 0x18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d;
    bytes32 private constant INIT_NULL_ROOT = 0x298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa;
    bytes32 private constant INIT_ROOT_ROOT = 0x2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071;
    uint32 private constant INIT_DATA_SIZE = 0;
    bool private constant ALLOW_THIRD_PARTY_CONTRACTS = false;

    ProxyAdmin internal proxyAdmin;
    RollupProcessorV2 internal rollupProcessor;
    PermitHelper internal permitHelper;
    ProxyDeployer internal proxyDeployer;
    RollupEncoder internal rollupEncoder;

    uint256 internal constant ESCAPE_BLOCK_LOWER_BOUND = 80;
    uint256 internal constant ESCAPE_BLOCK_UPPER_BOUND = 100;

    function setUp() public virtual {
        RollupDeployer rollupDeployer = new RollupDeployer();

        AlwaysTrueVerifier verifier = new AlwaysTrueVerifier();

        (address admin, address proxy, address permitHelper_, address proxyDeployer_, address defiProxy) =
        rollupDeployer.deploy(
            RollupDeployer.DeployParams(
                address(verifier),
                address(this),
                ESCAPE_BLOCK_LOWER_BOUND,
                ESCAPE_BLOCK_UPPER_BOUND,
                INIT_DATA_ROOT,
                INIT_NULL_ROOT,
                INIT_ROOT_ROOT,
                INIT_DATA_SIZE,
                ALLOW_THIRD_PARTY_CONTRACTS
            )
        );

        rollupDeployer.upgrade(admin, proxy);

        proxyAdmin = ProxyAdmin(admin);

        rollupProcessor = RollupProcessorV2(proxy);

        rollupProcessor.setRollupProvider(ROLLUP_PROVIDER, true);

        permitHelper = PermitHelper(permitHelper_);

        proxyDeployer = ProxyDeployer(proxyDeployer_);

        rollupEncoder = new RollupEncoder(address(rollupProcessor));
    }
}
