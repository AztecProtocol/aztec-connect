import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from '@aztec/barretenberg/address';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { ethers, network } from 'hardhat';
import { EthersAdapter, WalletProvider } from '../../src/provider';
import { RollupProcessor } from '../../src/rollup_processor';
import { TokenAsset } from '../fixtures/assets';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';

use(solidity);

describe('rollup_processor', () => {
  let rollupProcessorContract: Contract;
  let feeDistributor: Contract;
  let rollupProcessor: RollupProcessor;
  let weth: Contract;
  let tokenAssets: TokenAsset[];

  beforeEach(async () => {
    const provider = new WalletProvider(new EthersAdapter(network.provider));
    const web3Provider = new Web3Provider(provider);

    const [publisher] = await ethers.getSigners();

    ({ rollupProcessor: rollupProcessorContract, feeDistributor, tokenAssets, weth } = await setupRollupProcessor(
      publisher,
      [],
      0n,
    ));

    rollupProcessor = new RollupProcessor(EthAddress.fromString(rollupProcessorContract.address), web3Provider);
  });

  it('should get contract status', async () => {
    expect(rollupProcessor.address).deep.equals(EthAddress.fromString(rollupProcessorContract.address));
    expect(await rollupProcessor.feeDistributor()).deep.equals(EthAddress.fromString(feeDistributor.address));
    expect(await rollupProcessor.numberOfAssets()).equals(4);
    expect(await rollupProcessor.numberOfBridgeCalls()).equals(4);
    expect(await rollupProcessor.nextRollupId()).equals(0);
    expect(await rollupProcessor.dataSize()).equals(0);
    expect(await rollupProcessor.dataRoot()).deep.equals(WorldStateConstants.EMPTY_DATA_ROOT);
    expect(await rollupProcessor.nullRoot()).deep.equals(WorldStateConstants.EMPTY_NULL_ROOT);
    expect(await rollupProcessor.rootRoot()).deep.equals(WorldStateConstants.EMPTY_ROOT_ROOT);
    expect(await rollupProcessor.defiRoot()).deep.equals(WorldStateConstants.EMPTY_DEFI_ROOT);
    expect(await rollupProcessor.defiInteractionHash()).deep.equals(WorldStateConstants.INITIAL_INTERACTION_HASH);
    expect(await rollupProcessor.totalDeposited()).deep.equals([0n, 0n]);
    expect(await rollupProcessor.totalWithdrawn()).deep.equals([0n, 0n]);
    expect(await rollupProcessor.totalFees()).deep.equals([0n, 0n]);
    expect(await rollupProcessor.totalPendingDeposit()).deep.equals([0n, 0n]);
    expect(await rollupProcessor.weth()).deep.equal(EthAddress.fromString(weth.address));
    expect(await rollupProcessor.getSupportedAssets()).deep.equals(
      tokenAssets.map(a => EthAddress.fromString(a.contract.address)),
    );
    expect(await rollupProcessor.getEscapeHatchStatus()).deep.equals({ escapeOpen: true, blocksRemaining: 20 });
  });
});
