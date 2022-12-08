// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {Test} from "forge-std/Test.sol";
import {RollupDeployer} from "./RollupDeployer.s.sol";
import {PermitHelper} from "periphery/PermitHelper.sol";
import {AztecFeeDistributor} from "periphery/AztecFeeDistributor.sol";
import {DefiBridgeProxy} from "core/DefiBridgeProxy.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {Verifier28x32} from "core/verifier/instances/Verifier28x32.sol";
import {Verifier1x1} from "core/verifier/instances/Verifier1x1.sol";
import {MockVerifier} from "core/verifier/instances/MockVerifier.sol";
import {AlwaysTrueVerifier} from "../../test/mocks/AlwaysTrueVerifier.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {BridgesSetup} from "./BridgesSetup.s.sol";

contract E2ESetup is Test {
    using stdJson for string;

    // Multisigs
    address internal constant DEV_MS = 0x7095057A08879e09DC1c0a85520e3160A0F67C96;
    address internal constant MAINNET_MS = 0xE298a76986336686CC3566469e3520d23D1a8aaD;

    address internal constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    uint256 internal constant ESCAPE_BLOCK_LOWER_BOUND = 2160;
    uint256 internal constant ESCAPE_BLOCK_UPPER_BOUND = 2400;

    address internal constant ROLLUP_PROVIDER = payable(0xA173BDdF4953C1E8be2cA0695CFc07502Ff3B1e7);

    // Config
    bytes32 private constant INIT_DATA_ROOT = 0x18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d;
    bytes32 private constant INIT_NULL_ROOT = 0x298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa;
    bytes32 private constant INIT_ROOT_ROOT = 0x2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071;
    uint32 private constant INIT_DATA_SIZE = 0;
    bool private constant ALLOW_THIRD_PARTY_CONTRACTS = false;


    bytes32[4] internal ROLES =
        [bytes32(0), keccak256("OWNER_ROLE"), keccak256("EMERGENCY_ROLE"), keccak256("LISTER_ROLE")];

    struct FullParam {
        address verifier;
        address deployer;
        address safe;
        address provider;
        bool upgrade;
        bytes32 initDataRoot;
        bytes32 initNullRoot;
        bytes32 initRootRoot;
        uint32 initDataSize;
        bool allowThirdPartyContract;
    }

    function deployAlwaysTrueVerifier() public {
        vm.broadcast();
        AlwaysTrueVerifier verifier = new AlwaysTrueVerifier();
        _full(
            FullParam(
                address(verifier),
                tx.origin,
                tx.origin,
                tx.origin,
                false,
                INIT_DATA_ROOT,
                INIT_NULL_ROOT,
                INIT_ROOT_ROOT,
                INIT_DATA_SIZE,
                ALLOW_THIRD_PARTY_CONTRACTS
            )
        );
    }

    function deploy(
        address _deployer,
        address _safe,
        address _provider,
        string memory _verifier,
        bool _upgrade
    ) public {
        if (block.chainid == 1){
            revert("Deploy to mainnet not allowed");
        }

        bytes32 _verifierC = keccak256(abi.encodePacked(_verifier));
        address verifier;
        if (_verifierC == keccak256(abi.encodePacked("VerificationKey1x1"))) {
            vm.broadcast();
            verifier = address(new Verifier1x1());
        } else if (_verifierC == keccak256(abi.encodePacked("VerificationKey28x32"))) {
            vm.broadcast();
            verifier = address(new Verifier28x32());
        } else {
            vm.broadcast();
            verifier = address(new MockVerifier());
        }

        _full(
            FullParam(
                verifier,
                _deployer,
                _safe,
                _provider,
                _upgrade,
                INIT_DATA_ROOT,
                INIT_NULL_ROOT,
                INIT_ROOT_ROOT,
                INIT_DATA_SIZE,
                ALLOW_THIRD_PARTY_CONTRACTS
            )
        );
    }

    function _full(FullParam memory _params) internal {
        RollupDeployer rollupDeployer = new RollupDeployer();
        rollupDeployer.setIsDeploying(true);

        vm.broadcast();
        DefiBridgeProxy defiProxy = new DefiBridgeProxy();

        (address proxyAdmin, address proxy, address permitHelper, address proxyDeployer) = rollupDeployer.deploy(
            RollupDeployer.DeployParams(
                address(_params.verifier),
                address(defiProxy),
                _params.deployer,
                ESCAPE_BLOCK_LOWER_BOUND,
                ESCAPE_BLOCK_UPPER_BOUND,
                _params.initDataRoot,
                _params.initNullRoot,
                _params.initRootRoot,
                _params.initDataSize,
                _params.allowThirdPartyContract
            )
        );

        vm.broadcast();
        RollupProcessorV2(proxy).setRollupProvider(_params.provider, true);

        vm.broadcast();
        AztecFeeDistributor feeDistributor = new AztecFeeDistributor(_params.safe, proxy, UNISWAP_V2_ROUTER);

        if (_params.upgrade) {
            rollupDeployer.upgrade(proxyAdmin, proxy);
        }

        BridgesSetup bridgesSetup = new BridgesSetup();
        address dataProvider = bridgesSetup.setupAssetsAndBridges(address(proxy), address(permitHelper));

        setupRoles(proxy, _params.safe, _params.deployer);

        // Transfer ownerships
        if (PermitHelper(permitHelper).owner() != _params.safe) {
            vm.broadcast();
            PermitHelper(permitHelper).transferOwnership(_params.safe);
        }
        if (ProxyAdmin(proxyAdmin).owner() != _params.safe) {
            vm.broadcast();
            ProxyAdmin(proxyAdmin).transferOwnership(_params.safe);
        }
        
        outputAddresses(_params, address(proxyAdmin), address(proxy), address(permitHelper), address(proxyDeployer), address(defiProxy), address(feeDistributor)); 
    }

    function setupRoles(address _rollup, address _safe, address _deployer) public {
        RollupProcessorV2 rollup = RollupProcessorV2(_rollup);
        for (uint256 i = 0; i < ROLES.length; i++) {
            if (!rollup.hasRole(ROLES[i], _safe)) {
                vm.broadcast();
                rollup.grantRole(ROLES[i], _safe);
            }
        }

        if (_safe != _deployer) {
            vm.startBroadcast();
            rollup.revokeRole(ROLES[2], _deployer);
            rollup.revokeRole(ROLES[1], _deployer);
            rollup.revokeRole(ROLES[0], _deployer); // admin last
            vm.stopBroadcast();
        }
    }

    function outputAddresses(FullParam memory _params, address _proxyAdmin, address _proxy, address _permitHelper, address _proxyDeployer, address _defiProxy, address _feeDistributor) internal {
        // Write deployment addresses to json
        string memory json;
        json.serialize("Deployer", _params.deployer);
        json.serialize("Safe", _params.safe);
        json.serialize("ProxyAdmin", address(_proxyAdmin));
        json.serialize("Proxy", address(_proxy));
        json.serialize("PermitHelper", address(_permitHelper));
        json.serialize("ProxyDeployer", address(_proxyDeployer));
        json.serialize("DefiProxy", address(_defiProxy));
        json.serialize("Verifier", _params.verifier);
        json.serialize("FeeDistributor", address(_feeDistributor));
        json = json.serialize("Version", RollupProcessorV2(_proxy).getImplementationVersion());
        json.write("serve/contract_addresses.json");

        // Write deployment addresses to std out
        emit log_named_address("Deployer", _params.deployer);
        emit log_named_address("Safe         ", _params.safe);
        emit log_named_address("ProxyAdmin   ", address(_proxyAdmin));
        emit log_named_address("Proxy        ", address(_proxy));
        emit log_named_address("PermitHelper ", address(_permitHelper));
        emit log_named_address("ProxyDeployer", address(_proxyDeployer));
        emit log_named_address("DefiProxy    ", address(_defiProxy));
        emit log_named_address("Verifier     ", _params.verifier);
        emit log_named_address("FeeDistributor", address(_feeDistributor));
        emit log_named_uint("Version      ", RollupProcessorV2(_proxy).getImplementationVersion());
    }
}
