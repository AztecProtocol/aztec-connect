import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from '@aztec/barretenberg/address';
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
    expect(await rollupProcessor.dataRoot()).deep.equals(
      Buffer.from('2708a627d38d74d478f645ec3b4e91afa325331acf1acebe9077891146b75e39', 'hex'),
    );
    expect(await rollupProcessor.nullRoot()).deep.equals(
      Buffer.from('2694dbe3c71a25d92213422d392479e7b8ef437add81e1e17244462e6edca9b1', 'hex'),
    );
    expect(await rollupProcessor.rootRoot()).deep.equals(
      Buffer.from('2d264e93dc455751a721aead9dba9ee2a9fef5460921aeede73f63f6210e6851', 'hex'),
    );
    expect(await rollupProcessor.defiInteractionHash()).deep.equals(
      Buffer.from('0f115a0e0c15cdc41958ca46b5b14b456115f4baec5e3ca68599d2a8f435e3b8', 'hex'),
    );
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
