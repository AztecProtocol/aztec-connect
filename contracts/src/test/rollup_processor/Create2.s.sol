// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {Test} from "forge-std/Test.sol";

import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {RollupProcessorLibrary} from "rollup-encoder/libraries/RollupProcessorLibrary.sol";
import {RollupProcessor} from "core/processors/RollupProcessor.sol";

import {DefiBridgeProxy} from "core/DefiBridgeProxy.sol";
import {ProxyDeployer} from "periphery/ProxyDeployer.sol";

import {RollupDeployer} from "../../script/deployments/RollupDeployer.s.sol";
import {TestBase} from "../aztec/TestBase.sol";
import {ERC20Permit} from "../mocks/ERC20Permit.sol";
import {ProxyKiller} from "../mocks/ProxyKiller.sol";
import {AlwaysTrueVerifier} from "../mocks/AlwaysTrueVerifier.sol";

/**
 * @notice A test that will self destruct the rollup proxy and then deploy a new rollup proxy on the same address.
 * @dev We need to perform this test a bit differently, because self-destructs don't play nice inside foundry tests
 *      We use the standard signers in anvil, and require a fresh anvil for test to run successfully, as `redeployCreate2()`
 *      depends on addresses derived at specific nonces for the signer.
 *      How to run:
 *      Needs a local `anvil` network, run `anvil` in a terminal
 *      Afterwards, run `yarn test:create2` this will execute `killRollup()` and `redeployCreate2()`
 */

contract Create2Redeploy is Test {
    address internal constant ROLLUP_PROVIDER = payable(0xA173BDdF4953C1E8be2cA0695CFc07502Ff3B1e7);

    uint256 internal constant ESCAPE_BLOCK_LOWER_BOUND = 80;
    uint256 internal constant ESCAPE_BLOCK_UPPER_BOUND = 100;

    address internal constant USER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    bytes32 private constant VANITY_SALT = bytes32(bytes("Aztec Connect"));

    bytes32 private constant INIT_DATA_ROOT = 0x18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d;
    bytes32 private constant INIT_NULL_ROOT = 0x298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa;
    bytes32 private constant INIT_ROOT_ROOT = 0x2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071;
    uint32 private constant INIT_DATA_SIZE = 0;
    bool private constant ALLOW_THIRD_PARTY_CONTRACTS = false;

    RollupProcessor internal rollupProcessor;
    ProxyDeployer internal proxyDeployer;
    ProxyAdmin internal proxyAdmin;
    AlwaysTrueVerifier internal verifier;
    DefiBridgeProxy internal defiProxy;
    RollupDeployer internal rollupDeployer;

    function killRollup() public {
        vm.startBroadcast();
        ProxyKiller killer = new ProxyKiller();

        verifier = new AlwaysTrueVerifier();
        defiProxy = new DefiBridgeProxy();

        proxyDeployer = new ProxyDeployer();
        proxyAdmin = new ProxyAdmin();

        RollupProcessor implementation = new RollupProcessor(ESCAPE_BLOCK_LOWER_BOUND, ESCAPE_BLOCK_UPPER_BOUND);
        vm.stopBroadcast();

        bytes memory initializeCalldata = abi.encodeWithSignature(
            "initialize(address,address,address,bytes32,bytes32,bytes32,uint32,bool)",
            address(verifier),
            address(defiProxy),
            USER,
            INIT_DATA_ROOT,
            INIT_NULL_ROOT,
            INIT_ROOT_ROOT,
            INIT_DATA_SIZE,
            ALLOW_THIRD_PARTY_CONTRACTS
        );

        vm.startBroadcast();
        rollupProcessor = RollupProcessor(
            proxyDeployer.deployProxy(address(implementation), address(proxyAdmin), initializeCalldata, VANITY_SALT)
        );
        rollupProcessor.receiveEthFromBridge{value: 10 ether}(0);
        vm.stopBroadcast();

        assertEq(address(rollupProcessor).balance, 10 ether, "balance not matching");
        bytes32 initialDefiInteractionsHash = rollupProcessor.prevDefiInteractionsHash();

        vm.broadcast();
        proxyAdmin.upgradeAndCall(
            TransparentUpgradeableProxy(payable(address(rollupProcessor))),
            address(killer),
            abi.encodeWithSignature("initialize()")
        );

        assertEq(address(rollupProcessor).balance, 0, "eth not extract");
    }

    function redeployCreate2() public {
        verifier = AlwaysTrueVerifier(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);
        defiProxy = DefiBridgeProxy(0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0);
        address implementation = 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707;
        proxyAdmin = ProxyAdmin(0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9);
        rollupProcessor = RollupProcessor(0x5C7475798D0AfD69f1AC5E9D4141dF45361ADE3E);
        proxyDeployer = ProxyDeployer(0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9);
        bytes32 initialDefiInteractionsHash = 0x14e0f351ade4ba10438e9b15f66ab2e6389eea5ae870d6e8b2df1418b2e6fd5b;

        bytes memory initializeCalldata = abi.encodeWithSignature(
            "initialize(address,address,address,bytes32,bytes32,bytes32,uint32,bool)",
            address(verifier),
            address(defiProxy),
            USER,
            INIT_DATA_ROOT,
            INIT_NULL_ROOT,
            INIT_ROOT_ROOT,
            INIT_DATA_SIZE,
            ALLOW_THIRD_PARTY_CONTRACTS
        );

        vm.broadcast();
        proxyDeployer.deployProxy(implementation, address(proxyAdmin), initializeCalldata, VANITY_SALT);

        assertEq(
            rollupProcessor.prevDefiInteractionsHash(),
            initialDefiInteractionsHash,
            "rollup not deployed on same address"
        );
    }
}
