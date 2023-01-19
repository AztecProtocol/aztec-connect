// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Test} from "forge-std/Test.sol";
import {RollupDeployer} from "./RollupDeployer.s.sol";
import {PermitHelper} from "periphery/PermitHelper.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {Verifier28x32} from "core/verifier/instances/Verifier28x32.sol";
import {Verifier1x1} from "core/verifier/instances/Verifier1x1.sol";
import {MockVerifier} from "core/verifier/instances/MockVerifier.sol";
import {AlwaysTrueVerifier} from "../../test/mocks/AlwaysTrueVerifier.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {ChainSpecificSetup} from "./ChainSpecificSetup.s.sol";

contract E2ESetup is Test {
    using stdJson for string;
    using Strings for uint256;

    // Multisigs
    address internal constant DEV_MS = 0x7095057A08879e09DC1c0a85520e3160A0F67C96;
    address internal constant MAINNET_MS = 0xE298a76986336686CC3566469e3520d23D1a8aaD;

    uint256 internal constant ESCAPE_BLOCK_LOWER_BOUND = 2160;
    uint256 internal constant ESCAPE_BLOCK_UPPER_BOUND = 2400;

    address internal constant ROLLUP_PROVIDER = payable(0xA173BDdF4953C1E8be2cA0695CFc07502Ff3B1e7);
    bool private constant ALLOW_THIRD_PARTY_CONTRACTS = false;

    bytes32[4] internal ROLES =
        [bytes32(0), keccak256("OWNER_ROLE"), keccak256("EMERGENCY_ROLE"), keccak256("LISTER_ROLE")];

    struct FullParam {
        address verifier;
        address deployer;
        address safe;
        address faucetController;
        address provider;
        bool upgrade;
        bytes32 initDataRoot;
        bytes32 initNullRoot;
        bytes32 initRootRoot;
        uint32 initDataSize;
        bool allowThirdPartyContract;
    }

    /**
     * @notice Perform mock deployment with an always true verifier
     */
    function deployAlwaysTrueVerifier() public {
        vm.broadcast();
        AlwaysTrueVerifier verifier = new AlwaysTrueVerifier();

        // Get empty tree
        (bytes32 initDataRoot, bytes32 initNullRoot, bytes32 initRootsRoot, uint32 initDataSize) =
            getDefaultRootValues(true);

        _full(
            FullParam(
                address(verifier),
                tx.origin,
                tx.origin,
                tx.origin,
                tx.origin,
                false,
                initDataRoot,
                initNullRoot,
                initRootsRoot,
                initDataSize,
                ALLOW_THIRD_PARTY_CONTRACTS
            )
        );
    }

    /**
     * @notice Deploy with input configuration
     * @param _deployer Deployer address
     * @param _safe Admin safe address
     * @param _faucetController Faucet Admin address - for testnets
     * @param _provider Rollup Provider address
     * @param _verifier Verifier Contract setting - (VerificationKey1x1 | VerificationKey28x32 | MockVerifier)
     * @param _upgrade Upgrade flag
     */
    function deploy(
        address _deployer,
        address _safe,
        address _faucetController,
        address _provider,
        string memory _verifier,
        bool _upgrade
    ) public {
        if (block.chainid == 1) {
            revert("Deploy to mainnet not allowed");
        }

        address verifier;
        if (stringEq(_verifier, "VerificationKey1x1")) {
            vm.broadcast();
            verifier = address(new Verifier1x1());
        } else if (stringEq(_verifier, "VerificationKey28x32")) {
            vm.broadcast();
            verifier = address(new Verifier28x32());
        } else {
            vm.broadcast();
            verifier = address(new MockVerifier());
        }

        // Depending on the chainID that is being deployed to, the initial values will be different
        (bytes32 initDataRoot, bytes32 initNullRoot, bytes32 initRootsRoot, uint32 initDataSize) =
            getDefaultRootValues(false);

        _full(
            FullParam(
                verifier,
                _deployer,
                _safe,
                _faucetController,
                _provider,
                _upgrade,
                initDataRoot,
                initNullRoot,
                initRootsRoot,
                initDataSize,
                ALLOW_THIRD_PARTY_CONTRACTS
            )
        );
    }

    /**
     * @notice Full deployment, will deploy all required contracts.
     *         - The Rollup Deployer script handles deploying the Rollup, Proxy, DefiBridgeProxy and PermitHelper
     *         - ChainSpecificSetup deploys infra for both testnets / test suites. Which is deployed is determined by the chainid
     * @param _params FullParam all script input params
     */
    function _full(FullParam memory _params) internal {
        RollupDeployer rollupDeployer = new RollupDeployer();
        rollupDeployer.setIsDeploying(true);

        (address proxyAdmin, address proxy, address permitHelper, address proxyDeployer, address defiProxy) =
        rollupDeployer.deploy(
            RollupDeployer.DeployParams(
                address(_params.verifier),
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

        if (_params.upgrade) {
            rollupDeployer.upgrade(proxyAdmin, proxy);
        }

        // Grant the deployer permission to list bridges and assets
        vm.broadcast();
        RollupProcessorV2(proxy).grantRole(ROLES[3], _params.deployer);

        ChainSpecificSetup bridgesSetup = new ChainSpecificSetup();
        ChainSpecificSetup.BridgePeripheryAddresses memory peripheryAddresses = bridgesSetup.setupAssetsAndBridges(
            address(proxy), address(permitHelper), _params.faucetController, _params.safe
        );

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

        outputAddresses(
            _params,
            peripheryAddresses,
            address(proxyAdmin),
            address(proxy),
            address(permitHelper),
            address(proxyDeployer),
            address(defiProxy)
        );
    }

    /**
     * @notice Depending on the chain that is being deployed to, there are different root configurations for
     *         for the merkle trees. This function reads the chainId and returns the suitable values
     * @dev Values are verbatim from: https://github.com/AztecProtocol/aztec2-internal/blob/defi-bridge-project/yarn-project/barretenberg.js/src/environment/init/init_config.ts
     * @param empty If the empty flag is provided then roots for empty trees are returned
     * @return initDataRoot
     * @return initNullRoot
     * @return initRootsRoot
     * @return initDataSize
     */
    function getDefaultRootValues(bool empty)
        public
        returns (bytes32 initDataRoot, bytes32 initNullRoot, bytes32 initRootsRoot, uint32 initDataSize)
    {
        if (empty) {
            initDataRoot = 0x18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d;
            initNullRoot = 0x298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa;
            initRootsRoot = 0x2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071;
            initDataSize = 0;
        } else {
            uint256 chainId = block.chainid;
            if (chainId == 677868 || chainId == 359070 || chainId == 3567 || chainId == 359070 /* 0xa57ec ||0x57a9e || 0xdef */ ) {
                initDataRoot = 0x2a460f05d3dbdbb1d6ed8c3a1e589b13561dca0d49e4d496ae0d1d15c4aa1c68;
                initNullRoot = 0x1cb59b327064120bdf5ba23096b76cfe1ca8a45ab3db1b4f033bca92443cc025;
                initRootsRoot = 0x1c8ca5c80e65a610ca9326c65b7e1906864ad84e6c4d70e406f770f939934ecf;
                initDataSize = 18;
            } else {
                initDataRoot = 0x1417c092da90cfd39679299b8e381dd295dba6074b410e830ef6d3b7040b6eac;
                initNullRoot = 0x0225131cf7530ba9f617dba641b32020a746a6e0124310c09aac7c7c8a2e0ce5;
                initRootsRoot = 0x08ddeab28afc61bd560f0153f7399c9bb437c7cd280d0f4c19322227fcd80e05;
                initDataSize = 8;
            }
        }
    }

    /**
     * @notice Grant the safe all rollup admin roles, ensure that the deployer is stripped of all
     *         default roles or any roles granted for the purpose of deploying.
     * @param _rollup The address of the rollup contract (proxy)
     * @param _safe Admin Multisig
     * @param _deployer The deployer address
     */
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
            rollup.revokeRole(ROLES[3], _deployer);
            rollup.revokeRole(ROLES[2], _deployer);
            rollup.revokeRole(ROLES[1], _deployer);
            rollup.revokeRole(ROLES[0], _deployer); // admin last
            vm.stopBroadcast();
        }
    }

    /**
     * @notice Write deployed addreses to stdout and to a json file for consumption by other services
     * @param _params FullParam script input parameters
     * @param _peripheryAddresses Addresses deployed in `ChainSpecificSetup.sol`
     *        contains dataProvider, priceFeeds, faucet and fee distributor addresses
     * @param _proxyAdmin Address holding the proxy admin role
     * @param _proxy Address of the rollup proxy contract
     * @param _permitHelper Address of permit helper contract
     * @param _proxyDeployer Address of the proxy deployer
     * @param _defiProxy Address of the defi proxy
     */
    function outputAddresses(
        FullParam memory _params,
        ChainSpecificSetup.BridgePeripheryAddresses memory _peripheryAddresses,
        address _proxyAdmin,
        address _proxy,
        address _permitHelper,
        address _proxyDeployer,
        address _defiProxy
    ) internal {
        // Write deployment addresses to json
        string memory json;
        json.serialize("DEPLOYER_ADDRESS", _params.deployer);
        json.serialize("SAFE_ADDRESS", _params.safe);
        json.serialize("PROXY_ADMIN_ADDRESS", address(_proxyAdmin));
        json.serialize("ROLLUP_CONTRACT_ADDRESS", address(_proxy));
        json.serialize("PERMIT_HELPER_CONTRACT_ADDRESS", address(_permitHelper));
        json.serialize("PROXY_DEPLOYER_CONTRACT_ADDRESS", address(_proxyDeployer));
        json.serialize("DEFI_PROXY_CONTRACT_ADDRESS", address(_defiProxy));
        json.serialize("VERIFIER_CONTRACT_ADDRESS", _params.verifier);
        json.serialize("FEE_DISTRIBUTOR_ADDRESS", _peripheryAddresses.feeDistributor);
        json.serialize("BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS", _peripheryAddresses.dataProvider);
        json.serialize("GAS_PRICE_FEED_CONTRACT_ADDRESS", _peripheryAddresses.gasPriceFeed);
        json.serialize("DAI_PRICE_FEED_CONTRACT_ADDRESS", _peripheryAddresses.daiPriceFeed);
        json.serialize("FAUCET_CONTRACT_ADDRESS", _peripheryAddresses.faucet);
        json = json.serialize("VERSION", RollupProcessorV2(_proxy).getImplementationVersion());

        string memory path = string(abi.encodePacked("serve/contract_addresses.json"));
        json.write(path);
        emit log_string("Contracts written to:");
        emit log_string(path);

        // Write deployment addresses to std out
        emit log_named_address("Deployer", _params.deployer);
        emit log_named_address("Safe         ", _params.safe);
        emit log_named_address("ProxyAdmin   ", address(_proxyAdmin));
        emit log_named_address("Proxy        ", address(_proxy));
        emit log_named_address("PermitHelper ", address(_permitHelper));
        emit log_named_address("ProxyDeployer", address(_proxyDeployer));
        emit log_named_address("DefiProxy    ", address(_defiProxy));
        emit log_named_address("Verifier     ", _params.verifier);
        emit log_named_address("FeeDistributor", _peripheryAddresses.feeDistributor);
        emit log_named_address("BridgeDataProvider  ", _peripheryAddresses.dataProvider);
        emit log_named_address("GasPriceFeed  ", _peripheryAddresses.gasPriceFeed);
        emit log_named_address("DaiPriceFeed  ", _peripheryAddresses.daiPriceFeed);
        emit log_named_address("Faucet        ", _peripheryAddresses.faucet);

        emit log_named_uint("Version      ", RollupProcessorV2(_proxy).getImplementationVersion());
    }

    /**
     * @dev String comparison helper function (for aesthetics)
     */
    function stringEq(string memory a, string memory b) internal returns (bool) {
        return (keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b)));
    }
}
