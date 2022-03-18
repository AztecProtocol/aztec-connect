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
import { upgrades } from 'hardhat';

async function deployDefiBridge(signer: Signer, rollupProcessor: TestRollupProcessor, uniswapRouter: Contract) {
  // TODO - Create a bridge contract with two output assets.
  const defiBridgeLibrary = new ContractFactory(UniswapBridge.abi, UniswapBridge.bytecode, signer);
  const defiBridge = await defiBridgeLibrary.deploy(rollupProcessor.address.toString(), uniswapRouter.address);
  await defiBridge.deployed();
  await rollupProcessor.setSupportedBridge(EthAddress.fromString(defiBridge.address), 0);
  return defiBridge;
}

export async function upgradeTestRollupProcessor(rollupProvider: Signer, rollupProcessorAddress: EthAddress) {
  const UpgradedRollupProcessorContract = await ethers.getContractFactory(
    'UpgradedTestRollupProcessor',
    rollupProvider,
  );

  const newProcessor = await upgrades.upgradeProxy(rollupProcessorAddress.toString(), UpgradedRollupProcessorContract);
  await newProcessor.deployed();

  const rollupProcessor = new TestRollupProcessor(
    EthAddress.fromString(newProcessor.address),
    new EthersAdapter(ethers.provider),
  );
  return rollupProcessor;
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
  const ownerAddress = await rollupProvider.getAddress();
  const RollupProcessorContract = await ethers.getContractFactory('TestRollupProcessor', rollupProvider);

  const rollupProcessorContract = await upgrades.deployProxy(
    RollupProcessorContract,
    [
      mockVerifier.address,
      escapeBlockLowerBound,
      escapeBlockUpperBound,
      defiBridgeProxy.address,
      ownerAddress,
      '0x11977941a807ca96cf02d1b15830a53296170bf8ac7d96e5cded7615d18ec607',
      '0x1b831fad9b940f7d02feae1e9824c963ae45b3223e721138c6f73261e690c96a',
      '0x1b435f036fc17f4cc3862f961a8644839900a8e4f1d0b318a7046dd88b10be75',
      '0x0',
      false,
    ],
    { initializer: 'initialize' },
  );

  const rollupProcessor = new TestRollupProcessor(
    EthAddress.fromString(rollupProcessorContract.address),
    new EthersAdapter(ethers.provider),
  );

  const assets = await setupAssets(rollupProvider, signers, 10n ** 18n, numberOfTokenAssets);

  const { uniswapRouter, createPair } = await setupUniswap(rollupProvider);
  const { feeDistributor } = await setupFeeDistributor(
    rollupProvider,
    rollupProcessor.address,
    EthAddress.fromString(uniswapRouter.address),
  );

  const initialTotalSupply = 10n * 10n ** 18n;
  const tokenAssets: Array<Asset> = assets.slice(1);

  await Promise.all(tokenAssets.map(a => rollupProcessor.setSupportedAsset(a.getStaticInfo().address, true, 0)));

  await Promise.all(tokenAssets.map(a => createPair(a, initialTotalSupply)));

  const assetAddresses = assets.map(a => a.getStaticInfo().address);

  // first bridge (ID of 1) is a UniSwap bridge
  await deployDefiBridge(signers[0], rollupProcessor, uniswapRouter);
  return {
    rollupProcessor,
    rollupProcessorAddress: rollupProcessor.address,
    feeDistributor,
    feeDistributorAddress: feeDistributor.address,
    assets,
    assetAddresses,
  };
}
