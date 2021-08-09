import { Contracts } from './contracts';
import { EthersAdapter } from '..';
import { EthAddress } from '@aztec/barretenberg/address';
import { ethers } from 'hardhat';
import { setupRollupProcessor } from './rollup_processor/fixtures/setup_rollup_processor';
import { Signer } from 'ethers';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { FeeDistributor } from './fee_distributor';
import { RollupProcessor } from './rollup_processor';
import { Asset } from '@aztec/barretenberg/blockchain';
import { AssetId } from '@aztec/barretenberg/asset';
import { GasPriceFeed } from './price_feed';
import { deployMockDefiBridge } from './rollup_processor/fixtures/setup_defi_bridges';

describe('contracts tests', () => {
  let contracts: Contracts;
  let feeDistributor: FeeDistributor;
  let rollupProcessor: RollupProcessor;
  let signers: Signer[];
  let assets: Asset[];
  let uniswapBridgeIds: BridgeId[][];
  let uniswapBridgeAddrs: EthAddress[][];

  beforeAll(async () => {
    const ethereumProvider = new EthersAdapter(ethers.provider);
    signers = await ethers.getSigners();
    ({ rollupProcessor, feeDistributor, assets, uniswapBridgeIds, uniswapBridgeAddrs } = await setupRollupProcessor(
      signers,
      1,
    ));
    contracts = new Contracts(rollupProcessor, feeDistributor, assets, {} as GasPriceFeed, [], ethereumProvider, 1);
  });

  it('should get bridge id from contract address', async () => {
    const expected = uniswapBridgeIds[AssetId.ETH][AssetId.DAI];
    const bridgeAddr = uniswapBridgeAddrs[AssetId.ETH][AssetId.DAI];
    const bridgeId = await contracts.getBridgeId(bridgeAddr);
    expect(bridgeId).toEqual(expected);
  });

  it('should return zero bridge id if contract address does not exist', async () => {
    const bridgeId = await contracts.getBridgeId(EthAddress.randomAddress());
    expect(bridgeId).toEqual(BridgeId.ZERO);
  });

  it('should return zero bridge id if asset does not defined in rollup processor', async () => {
    const invalidBridge = await deployMockDefiBridge(
      signers[0],
      1,
      EthAddress.randomAddress(),
      EthAddress.randomAddress(),
      EthAddress.randomAddress(),
    );
    const bridgeId = await contracts.getBridgeId(EthAddress.fromString(invalidBridge.address));
    expect(bridgeId).toEqual(BridgeId.ZERO);
  });
});
