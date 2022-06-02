import { Asset } from '@aztec/barretenberg/blockchain';
import { EthAddress } from '@aztec/barretenberg/address';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { TestRollupProcessor } from './test_rollup_processor';
import { EthersAdapter } from '../../../provider';
import { setupAssets } from '../../asset/fixtures/setup_assets';
import { setupFeeDistributor } from '../../fee_distributor/fixtures/setup_fee_distributor';
import { setupUniswap } from '../../fee_distributor/fixtures/setup_uniswap';
import { Contract, ContractFactory } from 'ethers';
import UniswapBridge from '../../../artifacts/contracts/bridges/UniswapBridge.sol/UniswapBridge.json';
import { deployRollupProcessor } from '../../../deploy/deployers';
import { ProxyAdmin } from '../proxy_admin';

// eslint-disable-next-line @typescript-eslint/no-var-requires
// require('hardhat');

async function deployDefiBridge(signer: Signer, rollupProcessor: TestRollupProcessor, uniswapRouter: Contract) {
  // TODO - Create a bridge contract with two output assets.
  const defiBridgeLibrary = new ContractFactory(UniswapBridge.abi, UniswapBridge.bytecode, signer);
  const defiBridge = await defiBridgeLibrary.deploy(rollupProcessor.address.toString(), uniswapRouter.address);
  await defiBridge.deployed();
  await rollupProcessor.setSupportedBridge(EthAddress.fromString(defiBridge.address), 300000);
  return defiBridge;
}

export async function upgradeTestRollupProcessor(proxyAdmin: ProxyAdmin, rollupProcessorAddress: EthAddress) {
  const rollupProcessor = new TestRollupProcessor(rollupProcessorAddress, new EthersAdapter(ethers.provider));

  await proxyAdmin.upgradeUNSAFE(rollupProcessorAddress, await ethers.getContractFactory('TestRollupProcessor'), [
    await rollupProcessor.escapeBlockLowerBound(),
    await rollupProcessor.escapeBlockUpperBound(),
  ]);
}

export async function setupTestRollupProcessor(
  signers: Signer[],
  { numberOfTokenAssets = 2, escapeBlockLowerBound = 0, escapeBlockUpperBound = 1 } = {},
) {
  const rollupProvider = signers[0];
  const MockVerifier = await ethers.getContractFactory('MockVerifier');
  const mockVerifier = await MockVerifier.deploy();

  await mockVerifier.deployed();

  const DefiBridgeProxy = await ethers.getContractFactory('DefiBridgeProxy');
  const defiBridgeProxy = await DefiBridgeProxy.deploy();

  await defiBridgeProxy.deployed();

  const { rollup: rollupProcessorContract, proxyAdmin } = await deployRollupProcessor(
    rollupProvider,
    mockVerifier,
    defiBridgeProxy,
    await rollupProvider.getAddress(),
    escapeBlockLowerBound,
    escapeBlockUpperBound,
    Buffer.from('18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d', 'hex'),
    Buffer.from('298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa', 'hex'),
    Buffer.from('2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071', 'hex'),
    0,
    false,
  );

  await upgradeTestRollupProcessor(proxyAdmin, EthAddress.fromString(rollupProcessorContract.address));

  const rollupProcessor = new TestRollupProcessor(
    EthAddress.fromString(rollupProcessorContract.address),
    new EthersAdapter(ethers.provider),
  );

  await rollupProcessor.setRollupProvider(EthAddress.fromString(await rollupProvider.getAddress()), true);

  const assets = await setupAssets(rollupProvider, signers, 10n ** 18n, numberOfTokenAssets);

  const { uniswapRouter, createPair } = await setupUniswap(rollupProvider);
  const { feeDistributor } = await setupFeeDistributor(
    rollupProvider,
    rollupProcessor.address,
    EthAddress.fromString(uniswapRouter.address),
  );

  const initialTotalSupply = 10n * 10n ** 18n;
  const tokenAssets: Array<Asset> = assets.slice(1);

  await Promise.all(
    tokenAssets.map(a => a.getStaticInfo()).map(a => rollupProcessor.setSupportedAsset(a.address, a.gasLimit)),
  );

  await Promise.all(tokenAssets.map(a => createPair(a, initialTotalSupply)));

  const assetAddresses = assets.map(a => a.getStaticInfo().address);

  // first bridge (ID of 1) is a UniSwap bridge
  await deployDefiBridge(signers[0], rollupProcessor, uniswapRouter);
  return {
    proxyAdmin,
    rollupProcessor,
    rollupProcessorAddress: rollupProcessor.address,
    feeDistributor,
    feeDistributorAddress: feeDistributor.address,
    assets,
    assetAddresses,
  };
}
