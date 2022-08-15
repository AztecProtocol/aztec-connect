// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Test} from 'forge-std/Test.sol';

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {ProxyAdmin} from '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol';
import {TransparentUpgradeableProxy} from '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol';

import {PermitHelper} from 'ac/periphery/PermitHelper.sol';
import {IRollupProcessor} from 'ac/interfaces/IRollupProcessor.sol';
import {RollupProcessorV2} from 'ac/processors/RollupProcessorV2.sol';

contract Upgrade is Test {
    address internal FIX;

    uint256 internal constant VERSION_BEFORE = 1;
    uint256 internal constant VERSION_AFTER = 2;

    address internal MULTI_SIG;
    RollupProcessorV2 internal ROLLUP;
    ProxyAdmin internal PROXY_ADMIN;

    function setUp() public {
        if (block.chainid == 1) {
            MULTI_SIG = 0xE298a76986336686CC3566469e3520d23D1a8aaD;
            ROLLUP = RollupProcessorV2(0xFF1F2B4ADb9dF6FC8eAFecDcbF96A2B351680455);
        } else {
            MULTI_SIG = 0x7095057A08879e09DC1c0a85520e3160A0F67C96;
            ROLLUP = RollupProcessorV2(0x76Fefb38ac7A221ece94138F027d5e4505A856FE);
        }

        address admin = address(
            uint160(
                uint256(vm.load(address(ROLLUP), 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103))
            )
        );
        PROXY_ADMIN = ProxyAdmin(admin);

        emit log_named_uint('Network with chain id', block.chainid);
    }

    function run() public {}

    function fixTestnet() public {
        deployPermitHelper();
        deployRollup();

        require(ROLLUP.getImplementationVersion() == VERSION_BEFORE, "Version before don't match");

        bytes32[] memory values = new bytes32[](25);
        // Skip initialising (_initialized, _initializing)
        for (uint256 i = 1; i < 25; i++) {
            values[i] = vm.load(address(ROLLUP), bytes32(i));
        }
        ROLLUP.depositPendingFunds{value: 1 ether}(0, 1 ether, address(this), bytes32('dead'));
        address bridgeProxy = ROLLUP.defiBridgeProxy();
        uint256 gasLimit = ROLLUP.bridgeGasLimits(1);
        bytes32 prevDefiInteractionsHash = ROLLUP.prevDefiInteractionsHash();

        vm.broadcast();
        PROXY_ADMIN.upgradeAndCall(
            TransparentUpgradeableProxy(payable(address(ROLLUP))),
            FIX,
            abi.encodeWithSignature('initialize()')
        );

        require(ROLLUP.getImplementationVersion() == VERSION_AFTER, "Version after don't match");
        require(
            PROXY_ADMIN.getProxyImplementation(TransparentUpgradeableProxy(payable(address(ROLLUP)))) == FIX,
            'Implementation address not matching'
        );

        for (uint256 i = 1; i < 25; i++) {
            require(values[i] == vm.load(address(ROLLUP), bytes32(i)), 'Storage altered');
        }
        require(ROLLUP.depositProofApprovals(address(this), bytes32('dead')), 'Approval altered');
        require(ROLLUP.userPendingDeposits(0, address(this)) == 1 ether, 'Pending amount altered');
        require(ROLLUP.defiBridgeProxy() == bridgeProxy, 'Invalid bridgeProxy');
        require(ROLLUP.bridgeGasLimits(1) == gasLimit, 'Invalid bridge gas limit');
        require(ROLLUP.prevDefiInteractionsHash() == prevDefiInteractionsHash, 'Invalid prevDefiInteractionsHash');

        emit log('Upgrade successful');
        {
            // Add dev multisig at lister
            bytes32 lister = ROLLUP.LISTER_ROLE();
            bytes32 resume = ROLLUP.RESUME_ROLE();
            vm.startBroadcast();
            ROLLUP.grantRole(lister, MULTI_SIG);
            ROLLUP.grantRole(resume, MULTI_SIG);
            vm.stopBroadcast();

            require(ROLLUP.hasRole(lister, MULTI_SIG), 'Not lister');
            require(ROLLUP.hasRole(resume, MULTI_SIG), 'Not resume');
        }
    }

    function deploys() public {
        deployPermitHelper();
        deployRollup();
    }

    function deployRollup() public {
        emit log('== Start deployment of rollup fix');
        require(ROLLUP.getImplementationVersion() == VERSION_BEFORE, "Version before don't match");

        emit log('Deploy Rollup Processor');
        uint256 lowerBound = ROLLUP.escapeBlockLowerBound();
        uint256 upperBound = ROLLUP.escapeBlockUpperBound();

        vm.broadcast();
        RollupProcessorV2 fix = new RollupProcessorV2(lowerBound, upperBound);
        emit log_named_address('Rollup processor V2 address', address(fix));

        vm.expectRevert('Initializable: contract is already initialized');
        fix.initialize();

        require(fix.getImplementationVersion() == VERSION_AFTER, 'Fix Version not matching');
        emit log('== Fixed rollup contract deployed');

        FIX = address(fix);
    }

    function deployPermitHelper() public {
        emit log('== Start deployment of Permit Helper');

        vm.broadcast();
        PermitHelper ph = new PermitHelper(IRollupProcessor(address(ROLLUP)));

        if (ph.owner() != MULTI_SIG) {
            vm.broadcast();
            ph.transferOwnership(MULTI_SIG);
        }

        require(ph.owner() == MULTI_SIG, 'Multisig is not owner of permithelper');

        emit log_named_address('Permit Helper address', address(ph));
        emit log('== Permit Helper contract deployed');
    }

    function read() public {
        emit log_named_address('ROLLUP', address(ROLLUP));
        emit log_named_uint('Implementation version     ', ROLLUP.getImplementationVersion());
        emit log_named_bytes32('Rollup state hash          ', ROLLUP.rollupStateHash());
        emit log_named_uint('Number of bridges          ', ROLLUP.getSupportedBridgesLength());
        emit log_named_address('Owner of proxy admin       ', PROXY_ADMIN.owner());
        emit log_named_address(
            'Implementation address     ',
            PROXY_ADMIN.getProxyImplementation(TransparentUpgradeableProxy(payable(address(ROLLUP))))
        );
        _balances(address(ROLLUP));
    }

    function checkRoles() public {
        string[5] memory names = ['Admin', 'Owner', 'Emergency', 'Lister', 'Resume'];
        bytes32[5] memory roles = [
            bytes32(0), // Admin
            keccak256('OWNER_ROLE'),
            keccak256('EMERGENCY_ROLE'),
            keccak256('LISTER_ROLE'),
            keccak256('RESUME_ROLE')
        ];

        address[1] memory subjects = [MULTI_SIG];

        for (uint256 i = 0; i < subjects.length; i++) {
            emit log_named_address('Roles held by', subjects[i]);
            for (uint256 j = 0; j < names.length; j++) {
                emit log_named_string(names[j], ROLLUP.hasRole(roles[j], subjects[i]) ? 'Yes' : 'No');
            }
        }
    }

    function _balances(address _a) internal {
        emit log_named_address('= Balances for', _a);
        emit log_named_decimal_uint('  ETH', _a.balance, 18);
        emit log_named_decimal_uint('stETH', IERC20(0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0).balanceOf(_a), 18);
        emit log_named_decimal_uint('  DAI', IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F).balanceOf(_a), 18);
    }
}
