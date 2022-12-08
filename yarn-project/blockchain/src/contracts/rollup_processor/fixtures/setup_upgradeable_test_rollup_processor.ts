import { Asset, EthereumProvider } from '@aztec/barretenberg/blockchain';
import { EthAddress } from '@aztec/barretenberg/address';
import { Signer } from 'ethers';
import { RollupProcessor } from './../rollup_processor.js';
import { setupAssets } from '../../asset/fixtures/setup_assets.js';
import { setupUniswap } from '../../fee_distributor/fixtures/setup_uniswap.js';
import { Contract, ContractFactory } from 'ethers';
import { UniswapBridge, AlwaysTrueVerifier } from '../../../abis.js';
import { deployDefiBridgeProxy, deployRollupProcessor } from '../../../deploy/deployers/index.js';
import { Web3Provider } from '@ethersproject/providers';

async function deployDefiBridge(signer: Signer, rollupProcessor: RollupProcessor, uniswapRouter: Contract) {
  // TODO - Create a bridge contract with two output assets.
  const defiBridgeLibrary = new ContractFactory(UniswapBridge.abi, UniswapBridge.bytecode, signer);
  const defiBridge = await defiBridgeLibrary.deploy(rollupProcessor.address.toString(), uniswapRouter.address);
  await defiBridge.deployed();
  await rollupProcessor.setSupportedBridge(EthAddress.fromString(defiBridge.address), 300000);
  return defiBridge;
}

export async function setupTestRollupProcessor(
  provider: EthereumProvider,
  addresses: EthAddress[],
  { numberOfTokenAssets = 2, escapeBlockLowerBound = 80, escapeBlockUpperBound = 100, useLatest = true } = {},
) {
  const web3Provider = new Web3Provider(provider);
  const signer0 = web3Provider.getSigner(addresses[0].toString());

  const MockVerifier = new ContractFactory(AlwaysTrueVerifier.abi, AlwaysTrueVerifier.bytecode, signer0);
  const mockVerifier = await MockVerifier.deploy();

  await mockVerifier.deployed();
  const defiBridgeProxy = await deployDefiBridgeProxy(signer0);

  await defiBridgeProxy.deployed();

  const {
    rollup: rollupProcessorContract,
    proxyAdmin,
    permitHelper,
  } = await deployRollupProcessor(
    signer0,
    mockVerifier,
    defiBridgeProxy,
    addresses[0].toString(),
    escapeBlockLowerBound,
    escapeBlockUpperBound,
    Buffer.from('18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d', 'hex'),
    Buffer.from('298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa', 'hex'),
    Buffer.from('2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071', 'hex'),
    0,
    false,
    useLatest,
  );

  const rollupProcessor = new RollupProcessor(
    EthAddress.fromString(rollupProcessorContract.address),
    provider,
    EthAddress.fromString(permitHelper.address),
  );

  if (useLatest) {
    await rollupProcessor.grantRole(
      await rollupProcessor.rollupProcessor.LISTER_ROLE(),
      EthAddress.fromString(await signer0.getAddress()),
    );
    await rollupProcessor.grantRole(
      await rollupProcessor.rollupProcessor.RESUME_ROLE(),
      EthAddress.fromString(await signer0.getAddress()),
    );
  }

  await rollupProcessor.setRollupProvider(EthAddress.fromString(await signer0.getAddress()), true);

  const assets = await setupAssets(provider, addresses[0], addresses, 10n ** 18n, numberOfTokenAssets);

  const { uniswapRouter, createPair } = await setupUniswap(signer0);

  const initialTotalSupply = 10n * 10n ** 18n;
  const tokenAssets: Array<Asset> = assets.slice(1);

  for (const asset of tokenAssets) {
    const staticInfo = asset.getStaticInfo();
    await rollupProcessor.setSupportedAsset(staticInfo.address, staticInfo.gasLimit);
    await createPair(asset, initialTotalSupply);
  }

  const assetAddresses = assets.map(a => a.getStaticInfo().address);

  // first bridge (ID of 1) is a UniSwap bridge
  await deployDefiBridge(signer0, rollupProcessor, uniswapRouter);
  return {
    proxyAdmin,
    rollupProcessor,
    rollupProcessorAddress: rollupProcessor.address,
    assets,
    assetAddresses,
  };
}
