import { EthAddress } from '@aztec/barretenberg/address';
import { Asset } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { EthersAdapter } from '..';
import { Contracts } from './contracts';
import { FeeDistributor } from './fee_distributor';
import { GasPriceFeed } from './price_feed';
import { RollupProcessor } from './rollup_processor';
import { deployMockBridge, MockBridgeParams } from './rollup_processor/fixtures/setup_defi_bridges';
import { setupTestRollupProcessor } from './rollup_processor/fixtures/setup_test_rollup_processor';

describe('contracts tests', () => {
  let contracts: Contracts;
  let rollupProvider: Signer;
  let feeDistributor: FeeDistributor;
  let rollupProcessor: RollupProcessor;
  let signers: Signer[];
  let assets: Asset[];
  let assetAddresses: EthAddress[];

  const mockBridge = async (params: MockBridgeParams = {}) =>
    deployMockBridge(rollupProvider, rollupProcessor.address, assetAddresses, params);

  beforeAll(async () => {
    const ethereumProvider = new EthersAdapter(ethers.provider);
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    ({ rollupProcessor, feeDistributor, assets, assetAddresses } = await setupTestRollupProcessor(signers));
    contracts = new Contracts(rollupProcessor, feeDistributor, assets, {} as GasPriceFeed, [], ethereumProvider, 1);
  });

  it('should get bridge id from contract address', async () => {
    const bridge = await mockBridge();
    const bridgeId = await contracts.getBridgeId(bridge.address);
    expect(bridgeId).toEqual(bridge);
  });

  it('should return zero bridge id if contract address does not exist', async () => {
    const bridgeId = await contracts.getBridgeId(EthAddress.randomAddress());
    expect(bridgeId).toEqual(BridgeId.ZERO);
  });

  it('should return zero bridge id if asset is not defined in rollup processor', async () => {
    const invalidBridge = await mockBridge({
      inputAsset: EthAddress.randomAddress(),
    });
    const bridgeId = await contracts.getBridgeId(invalidBridge.address);
    expect(bridgeId).toEqual(BridgeId.ZERO);
  });
});
