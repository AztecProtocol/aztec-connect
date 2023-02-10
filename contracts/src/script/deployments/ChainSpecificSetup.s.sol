// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Test} from "forge-std/Test.sol";
import {PermitHelper} from "periphery/PermitHelper.sol";
import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";
import {AggregateDeployment} from "bridge-deployments/AggregateDeployment.s.sol";
import {ERC20Permit} from "../../test/mocks/ERC20Permit.sol";
import {AztecFeeDistributor} from "periphery/AztecFeeDistributor.sol";

// Mocks
import {DummyDefiBridge} from "../../test/mocks/DummyDefiBridge.sol";
import {SyncBridge} from "../../test/mocks/SyncBridge.sol";
import {AsyncBridge} from "../../test/mocks/AsyncBridge.sol";
import {IDefiBridge} from "core/interfaces/IDefiBridge.sol";
import {AztecFaucet} from "periphery/AztecFaucet.sol";
import {MockChainlinkOracle} from "../../test/mocks/MockChainlinkOracle.sol";
import {MockBridgeDataProvider} from "../../test/mocks/MockBridgeDataProvider.sol";

contract ChainSpecificSetup is Test {
    // Mainnet fork key addresses
    address internal constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address internal constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    // Mainnet addresses for criticial components
    address internal constant MAINNET_GAS_PRICE_FEED = 0x169E633A2D1E6c10dD91238Ba11c4A708dfEF37C;
    address internal constant MAINNET_DAI_PRICE_FEED = 0x773616E4d11A78F511299002da57A0a94577F1f4;

    /// @notice Addresses that are returned when setting up a testnet
    struct BridgePeripheryAddresses {
        address dataProvider;
        address gasPriceFeed;
        address daiPriceFeed;
        address dai;
        address btc;
        address faucet;
        address feeDistributor;
    }

    /**
     * @notice Deploys bridges for E2E or full setup based on chain-id
     * @param _proxy The address of the rollup proxy
     * @param _permitHelper The address of the permit helper
     * @param _faucetOperator The address of the faucet operator
     * @param _safe The address of the Multisig Safe
     * @return BridgePeripheryAddress contains dataProvider, priceFeeds, faucet and fee distributor addresses
     */
    function setupAssetsAndBridges(address _proxy, address _permitHelper, address _faucetOperator, address _safe)
        public
        returns (BridgePeripheryAddresses memory)
    {
        uint256 chainId = block.chainid;

        //   mainnet          dev               stage                testnet
        if (chainId == 1 || chainId == 3567 || chainId == 359059 || chainId == 677868) {
            // Deploy Data Provider and list bridges | assets
            (address dataProvider, address feeDistributor) = setupAssetAndBridgesMainnet(_proxy, _permitHelper, _safe);

            // Deploy Faucet and set operator
            address faucet = deployFaucet(_faucetOperator);

            return BridgePeripheryAddresses({
                dataProvider: dataProvider,
                gasPriceFeed: MAINNET_GAS_PRICE_FEED,
                daiPriceFeed: MAINNET_DAI_PRICE_FEED,
                dai: DAI,
                btc: address(0),
                faucet: faucet,
                feeDistributor: feeDistributor
            });
        } else {
            return setupAssetsAndBridgesTests(_proxy, _permitHelper, _faucetOperator);
        }
    }

    /**
     * @notice Deploys bridges for full setup with the aggregate deployment from bridges repo
     * @param _proxy The address of the rollup proxy
     * @param _permitHelper The address of the permit helper
     * @param _safe The address of the Multisig Safe
     * @return data provider and fee distributor addresses
     */
    function setupAssetAndBridgesMainnet(address _proxy, address _permitHelper, address _safe)
        public
        returns (address, address)
    {
        vm.broadcast();
        RollupProcessorV2(_proxy).setSupportedAsset(DAI, 55000);

        vm.broadcast();
        PermitHelper(_permitHelper).preApprove(DAI);

        // Set environment variables
        string memory rollupProcessorAddressString = vm.toString(_proxy);
        vm.setEnv("ROLLUP_PROCESSOR_ADDRESS", rollupProcessorAddressString);
        vm.setEnv("LISTER_ADDRESS", rollupProcessorAddressString);

        // Deploy Fee Distributor as on fork
        vm.broadcast();
        AztecFeeDistributor feeDistributor = new AztecFeeDistributor(_safe, _proxy, UNISWAP_V2_ROUTER);

        // Deploy bridges
        AggregateDeployment aggDeploy = new AggregateDeployment();
        aggDeploy.setUp();
        address dataProvider = aggDeploy.deployAndListAll();

        return (dataProvider, address(feeDistributor));
    }

    /**
     * @notice Deploys bridges for E2E tests
     * @param _proxy The address of the rollup proxy
     * @param _permitHelper The address of the permit helper
     * @param _faucetOperator The address of the faucet operator
     * @return BridgePeripheryAddresses contains dataProvider, priceFeeds, faucet and fee distributor addresses
     */
    function setupAssetsAndBridgesTests(address _proxy, address _permitHelper, address _faucetOperator)
        public
        returns (BridgePeripheryAddresses memory)
    {
        int256 daiPrice = 1 * 10 ** 15; // 1000 DAI/ETH
        uint256 initialEthSupply = 0.1 ether;
        uint256 initialTokenSupply = (initialEthSupply * 1 ether) / uint256(daiPrice);

        // Removes the caps to not run into unwanted issues in E2E tests
        vm.broadcast();
        RollupProcessorV2(_proxy).setCapped(false);

        // Deploy two mock erc20s
        ERC20Permit dai = deployERC20(_proxy, _permitHelper, "DAI", 18); // asset 1
        ERC20Permit btc = deployERC20(_proxy, _permitHelper, "BTC", 8); // asset 2

        // Deploy dummy bridge
        deployDummyBridge(_proxy, [address(dai), address(btc)]); // bridge 1

        // Deploy sync and async bridge
        SyncBridge syncBridge = deploySyncBridge(_proxy, address(dai)); // bridge 2
        AsyncBridge asyncBridge = deployAsyncBridge(_proxy, address(dai)); // bridge 3

        // Deploy mock data provider
        vm.broadcast();
        MockBridgeDataProvider mockDataProvider = new MockBridgeDataProvider();

        // Set mock bridge data
        vm.broadcast();
        mockDataProvider.setBridgeData(1, address(syncBridge), 50000, "Sync Bridge");
        vm.broadcast();
        mockDataProvider.setBridgeData(2, address(asyncBridge), 50000, "Async Bridge");

        // Deploy Price Feeds
        vm.broadcast();
        MockChainlinkOracle gasPriceFeed = new MockChainlinkOracle(20 gwei);

        vm.broadcast();
        MockChainlinkOracle daiPriceFeed = new MockChainlinkOracle(daiPrice);

        // Deploy faucet
        address faucet = deployFaucet(_faucetOperator);

        // return all of the addresses that have just been deployed
        return BridgePeripheryAddresses({
            dataProvider: address(mockDataProvider),
            gasPriceFeed: address(gasPriceFeed),
            daiPriceFeed: address(daiPriceFeed),
            dai: address(dai),
            btc: address(btc),
            faucet: faucet,
            feeDistributor: address(0) // Not required in end to end tests
        });
    }

    /**
     * @notice Deploy a new faucet and set the faucet operator
     * @param _faucetOperator The address of the new operator - nb: we dont need to worry about it being 0
     * @return address of new Faucet
     */
    function deployFaucet(address _faucetOperator) internal returns (address) {
        vm.broadcast();
        AztecFaucet faucet = new AztecFaucet();

        vm.broadcast();
        faucet.updateSuperOperator(_faucetOperator, true);

        return address(faucet);
    }

    /**
     * @notice Deploy a mock ERC20 for use in the e2e test, adds the ERC20 to the rollup then
     *         pre approve
     * @param _proxy Rollup address
     * @param _permitHelper Permit Helper address
     * @param _symbol Mock token symbol
     * @param _decimals Token decimals
     * @return mockToken ERC20Permit
     *
     */
    function deployERC20(address _proxy, address _permitHelper, string memory _symbol, uint8 _decimals)
        internal
        returns (ERC20Permit mockToken)
    {
        uint256 dummyTokenMockGasLimit = 55000;

        vm.broadcast();
        mockToken = new ERC20Permit(_symbol);

        if (_decimals != 18) {
            vm.broadcast();
            mockToken.setDecimals(_decimals);
        }
        vm.broadcast();
        RollupProcessorV2(_proxy).setSupportedAsset(address(mockToken), dummyTokenMockGasLimit);
        vm.broadcast();
        PermitHelper(_permitHelper).preApprove(address(mockToken));
    }

    /**
     * @notice Deploy a dummy defi bridge and add it to the rollup
     * @param _proxy Rollup address
     * @param assets Bridge input assets
     * @return dummyDefiBridge DummyDefiBridge
     */
    function deployDummyBridge(address _proxy, address[2] memory assets)
        internal
        returns (DummyDefiBridge dummyDefiBridge)
    {
        uint256 dummyGasLimit = 300000;
        uint256 outputValueEth = 0.001 ether;
        uint256 outputValueToken = 100 ether;
        uint256 outputVirtualValueA = uint256(uint192(bytes24(0x0123456789abcdef0123456789abcdef0123456789abcdef)));
        uint256 outputVirtualValueB = 10;

        // the amount of the token to mint to the proxy
        uint256 topupTokenValue = outputValueToken * 100;

        vm.broadcast();
        dummyDefiBridge = new DummyDefiBridge(
            _proxy, outputValueEth, outputValueToken, outputVirtualValueA, outputVirtualValueB
        );

        emit log_named_address("Dummy Defi Bridge", address(dummyDefiBridge));

        for (uint256 i; i < assets.length; ++i) {
            vm.broadcast();
            ERC20Permit(assets[i]).mint(address(dummyDefiBridge), topupTokenValue);
        }

        vm.broadcast();
        RollupProcessorV2(_proxy).setSupportedBridge(address(dummyDefiBridge), dummyGasLimit);
    }

    /**
     * @notice Deploys a Dummy Sync Bridge to be used in the test suite
     * @param _proxy Address of the RollupProcessor
     * @param _asset Address of the asset to be added to the bridge
     * @return syncBridge
     */
    function deploySyncBridge(address _proxy, address _asset) internal returns (SyncBridge syncBridge) {
        // Dummy values
        uint256 dummyGasLimit = 200000;
        uint256 outputValueA = 257 * 10 ** 12;

        // Bridge actions
        SyncBridge.SubAction memory subAction = SyncBridge.SubAction({
            target: _asset,
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", _proxy, outputValueA)
        });
        SyncBridge.Action memory bridgeAction =
            SyncBridge.Action({outputA: outputValueA, outputB: 0, subs: new SyncBridge.SubAction[](1)});
        bridgeAction.subs[0] = subAction;

        vm.startBroadcast();
        syncBridge = new SyncBridge();
        syncBridge.setAction(bridgeAction);

        // Support Bridge
        RollupProcessorV2(_proxy).setSupportedBridge(address(syncBridge), dummyGasLimit);

        // Mint outputValue of outtoken to bridge
        ERC20Permit(_asset).mint(address(syncBridge), outputValueA);
        vm.stopBroadcast();

        emit log_named_address("Sync Bridge", address(syncBridge));
    }

    /**
     * @notice Deploys a Dummy Async Bridge to be used in the test suite
     * @param _proxy Address of the RollupProcessor
     * @param _asset Address of the asset to be added to the bridge
     * @return asyncBridge
     */
    function deployAsyncBridge(address _proxy, address _asset) internal returns (AsyncBridge asyncBridge) {
        // Dummy values
        uint256 dummyGasLimit = 200000;
        uint256 outputValueA = 257 * 10 ** 12;

        // Bridge actions
        AsyncBridge.SubAction memory subAction = AsyncBridge.SubAction({
            target: _asset,
            value: 0,
            data: abi.encodeWithSignature("approve(address,uint256)", _proxy, outputValueA)
        });
        AsyncBridge.Action memory bridgeAction = AsyncBridge.Action({
            outputA: outputValueA,
            outputB: 0,
            interactionComplete: true,
            subs: new AsyncBridge.SubAction[](1)
        });
        bridgeAction.subs[0] = subAction;

        vm.startBroadcast();
        asyncBridge = new AsyncBridge();

        asyncBridge.setAction(bridgeAction);

        // Support Bridge
        RollupProcessorV2(_proxy).setSupportedBridge(address(asyncBridge), dummyGasLimit);

        // Mint outputValue of outtoken to bridge
        ERC20Permit(_asset).mint(address(asyncBridge), outputValueA);
        vm.stopBroadcast();

        emit log_named_address("Async Bridge", address(asyncBridge));
    }
}
