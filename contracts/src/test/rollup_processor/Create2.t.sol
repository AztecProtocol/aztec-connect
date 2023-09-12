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
 * @notice  Test that checks that our deployment using create 2 cannot be overwritten while active
 *          and that if self-destructed, the non-eth assets are still owned by the contract.
 *          Note that there is a `Create2.s.sol` test as well for redeploying at the self-destructed
 *          address.
 */
contract Create2Test is Test {
    address internal constant ROLLUP_PROVIDER = payable(0xA173BDdF4953C1E8be2cA0695CFc07502Ff3B1e7);

    bytes32 private constant VANITY_SALT = bytes32(bytes("Aztec Connect"));

    bytes32 private constant INIT_DATA_ROOT = keccak256("TEST_DATA_ROOT");
    bytes32 private constant INIT_NULL_ROOT = keccak256("TEST_NULL_ROOT");
    bytes32 private constant INIT_ROOT_ROOT = keccak256("TEST_ROOT_ROOT");
    uint32 private constant INIT_DATA_SIZE = 0;
    bool private constant ALLOW_THIRD_PARTY_CONTRACTS = false;

    RollupProcessor internal rollupProcessor;
    ProxyDeployer internal proxyDeployer;
    ProxyAdmin internal proxyAdmin;

    AlwaysTrueVerifier internal verifier;
    DefiBridgeProxy internal defiProxy;
    RollupDeployer internal rollupDeployer;

    bytes internal initializeCalldata;

    function setUp() public {
        verifier = new AlwaysTrueVerifier();
        rollupDeployer = new RollupDeployer();

        (address admin, address proxy,, address proxyDeployer_, address defiProxy) = rollupDeployer.deploy(
            RollupDeployer.DeployParams(
                address(verifier),
                address(this),
                80,
                100,
                INIT_DATA_ROOT,
                INIT_NULL_ROOT,
                INIT_ROOT_ROOT,
                INIT_DATA_SIZE,
                ALLOW_THIRD_PARTY_CONTRACTS
            )
        );

        initializeCalldata = abi.encodeWithSignature(
            "initialize(address,address,address,bytes32,bytes32,bytes32,uint32,bool)",
            address(verifier),
            address(defiProxy),
            address(this),
            INIT_DATA_ROOT,
            INIT_NULL_ROOT,
            INIT_ROOT_ROOT,
            INIT_DATA_SIZE,
            ALLOW_THIRD_PARTY_CONTRACTS
        );

        proxyAdmin = ProxyAdmin(admin);
        rollupProcessor = RollupProcessor(proxy);
        rollupProcessor.setRollupProvider(ROLLUP_PROVIDER, true);
        proxyDeployer = ProxyDeployer(proxyDeployer_);
    }

    function testRedeployOnExistingSalt() public {
        address implementation =
            proxyAdmin.getProxyImplementation(TransparentUpgradeableProxy(payable(address(rollupProcessor))));

        vm.expectRevert();
        proxyDeployer.deployProxy(address(implementation), address(proxyAdmin), initializeCalldata, VANITY_SALT);
    }

    function testKillRollupERC20StaysButEthGone() public {
        ERC20Permit token = new ERC20Permit('token');
        token.mint(address(rollupProcessor), 1000 ether);

        ProxyKiller killer = new ProxyKiller();

        rollupProcessor.receiveEthFromBridge{value: 10 ether}(0);
        assertEq(address(rollupProcessor).balance, 10 ether);

        vm.prank(proxyAdmin.owner());
        proxyAdmin.upgradeAndCall(
            TransparentUpgradeableProxy(payable(address(rollupProcessor))),
            address(killer),
            abi.encodeWithSignature("initialize()")
        );

        assertEq(address(rollupProcessor).balance, 0, "eth not extract");
        assertEq(token.balanceOf(address(rollupProcessor)), 1000 ether, "tokens left in contract");
    }
}
