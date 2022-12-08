// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Test} from 'forge-std/Test.sol';
import {PermitHelper} from 'periphery/PermitHelper.sol';
import {RollupProcessorV2} from 'core/processors/RollupProcessorV2.sol';
import {AggregateDeployment} from 'bridge-deployments/AggregateDeployment.s.sol';
import {ERC20Permit} from '../../test/mocks/ERC20Permit.sol';

contract BridgesSetup is Test {
    address internal constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    /**
     * @notice Deploys bridges for E2E or full setup based on chain-id
     * @param _proxy The address of the rollup proxy
     * @param _permitHelper The address of the permit helper
     * @return The address of the data provider
     */
    function setupAssetsAndBridges(address _proxy, address _permitHelper) public returns (address) {
        uint256 chainId = block.chainid;

        if (chainId == 1 || chainId == 3567 || chainId == 677868) {
            address dataProvider = setupAssetAndBridgesMainnet(_proxy, _permitHelper);

            return dataProvider;
        } else {
            address dataProvider = setupAssetsAndBridgesTests(_proxy, _permitHelper);
            return dataProvider;
        }
    }

    /**
     * @notice Deploys bridges for full setup with the aggregate deployment from bridges repo
     * @param _proxy The address of the rollup proxy
     * @param _permitHelper The address of the permit helper
     * @return The address of the data provider
     */
    function setupAssetAndBridgesMainnet(address _proxy, address _permitHelper) public returns (address) {
        vm.broadcast();
        RollupProcessorV2(_proxy).setSupportedAsset(DAI, 55000);

        vm.broadcast();
        PermitHelper(_permitHelper).preApprove(DAI);

        // Set environment variables
        string memory rollupProcessorAddressString = vm.toString(_proxy);
        vm.setEnv('ROLLUP_PROCESSOR_ADDRESS', rollupProcessorAddressString);
        vm.setEnv('LISTER_ADDRESS', rollupProcessorAddressString);

        AggregateDeployment aggDeploy = new AggregateDeployment();
        aggDeploy.setUp();
        address dataProvider = aggDeploy.deployAndListAll();

        return dataProvider;
    }

    /**
     * @notice Deploys bridges for E2E tests
     * @param _proxy The address of the rollup proxy
     * @param _permitHelper The address of the permit helper
     * @return The address of the data provider
     */

    function setupAssetsAndBridgesTests(address _proxy, address _permitHelper) public returns (address) {
        // Removes the caps to not run into unwanted issues in E2E tests
        vm.broadcast();
        RollupProcessorV2(_proxy).setCapped(false);

        return address(0);
    }
}
