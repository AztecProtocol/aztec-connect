import { EthAddress } from '@aztec/barretenberg/address';
import { InitHelpers } from '@aztec/barretenberg/environment';
import { Contract, ContractFactory, Signer } from 'ethers';
import RollupProcessor from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { addAsset } from './add_asset/add_asset';
import { deployDefiBridgeProxy } from './deploy_defi_bridge_proxy';
import { deployDummyBridge } from './deploy_dummy_bridge';
import {
  deployElementBridge,
  deployMockElementContractRegistry,
  elementAssets,
  elementConfig,
  setupElementPools,
} from './deploy_element';
import { deployFeeDistributor } from './deploy_fee_distributor';
import { deployLidoBridge } from './deploy_lido';
import { deployPriceFeed } from './deploy_price_feed';
import { createUniswapPair, deployUniswap, deployUniswapBridge } from './deploy_uniswap';
import { deployMockVerifier, deployVerifier } from './deploy_verifier';

const gasLimit = 5000000;

async function deployRollupProcessor(
  signer: Signer,
  verifier: Contract,
  defiProxy: Contract,
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  initDataRoot: Buffer,
  initNullRoot: Buffer,
  initRootsRoot: Buffer,
  initDataSize: number,
  allowThirdPartyContracts: boolean,
) {
  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);
  const rollup = await rollupFactory.deploy();
  const address = await signer.getAddress();

  await rollup.initialize(
    verifier.address,
    escapeHatchBlockLower,
    escapeHatchBlockUpper,
    defiProxy.address,
    address,
    initDataRoot,
    initNullRoot,
    initRootsRoot,
    initDataSize,
    allowThirdPartyContracts,
    { gasLimit },
  );

  await rollup.setRollupProvider(address, true, { gasLimit });

  console.error(`RollupProcessor contract address: ${rollup.address}`);

  return rollup;
}

async function deployErc20Contracts(signer: Signer, rollup: Contract) {
  const asset0 = await addAsset(rollup, signer, true, 'DAI');
  const asset1 = await addAsset(rollup, signer, true, 'BTC', 8);
  return [asset0, asset1];
}

async function deployBridgeContracts(
  signer: Signer,
  rollup: Contract,
  uniswapRouter: Contract,
  erc20Assets: Contract[],
) {
  // Uniswap
  {
    const uniswapBridge = await deployUniswapBridge(signer, rollup, uniswapRouter);
    await rollup.setSupportedBridge(uniswapBridge.address, 300000n, { gasLimit });
  }

  // Dummy bridge for testing
  {
    const outputValueEth = 10n ** 15n; // 0.001
    const outputValueToken = 10n ** 20n; // 100
    const outputVirtualValueA = BigInt('0x123456789abcdef0123456789abcdef0123456789abcdef');
    const outputVirtualValueB = 10n;
    const dummyBridge = await deployDummyBridge(
      rollup,
      signer,
      outputValueEth,
      outputValueToken,
      outputVirtualValueA,
      outputVirtualValueB,
    );

    const topupTokenValue = outputValueToken * 100n;
    await erc20Assets[0].mint(dummyBridge.address, topupTokenValue, { gasLimit });
    await erc20Assets[1].mint(dummyBridge.address, topupTokenValue, { gasLimit });

    await rollup.setSupportedBridge(dummyBridge.address, 300000n, { gasLimit });
  }

  const chainId = await signer.getChainId();
  const isMainnet = chainId === 1 || chainId === 0xa57ec;

  // Element
  if (!isMainnet) {
    console.error(`We are neither mainnet nor mainnet-fork. Skipping ElementBridge deployment.`);
  } else {
    for (const elementAsset of elementAssets) {
      await rollup.setSupportedAsset(elementAsset, 0, { gasLimit });
    }

    const elementRegistry = await deployMockElementContractRegistry(signer, elementConfig);

    const elementBridge = await deployElementBridge(
      signer,
      rollup.address,
      elementConfig.trancheFactoryAddress,
      elementConfig.trancheByteCodeHash,
      elementConfig.balancerAddress,
      elementRegistry.address,
    );
    await rollup.setSupportedBridge(elementBridge.address, 800000n, { gasLimit });

    await setupElementPools(elementConfig, elementBridge);
  }

  // Lido
  if (!isMainnet) {
    console.error(`We are neither mainnet nor mainnet-fork. Skipping LidoBridge deployment.`);
  } else {
    const lidoBridge = await deployLidoBridge(signer, rollup);
    await rollup.setSupportedBridge(lidoBridge.address, 500000n, { gasLimit });
  }
}

/**
 * We add gasLimit to all txs, to prevent calls to estimateGas that may fail. If a gasLimit is provided the calldata
 * is simply produced, there is nothing to fail. As long as all the txs are executed by the evm in order, things
 * should succeed. The NonceManager ensures all the txs have sequentially increasing nonces.
 * In some cases there maybe a "deployment sync point" which is required if we are making a "call" to the blockchain
 * straight after, that assumes the state is up-to-date at that point.
 * This drastically improves deployment times.
 */
export async function deploy(
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  signer: Signer,
  initialEthSupply = 1n * 10n ** 17n, // 0.1 ETH
  vk?: string,
) {
  const signerAddress = await signer.getAddress();
  console.error(`Signer: ${signerAddress}`);

  const chainId = await signer.getChainId();
  console.error(`Chain id: ${chainId}`);

  const { initDataRoot, initNullRoot, initRootsRoot } = InitHelpers.getInitRoots(chainId);
  const initDataSize: number = InitHelpers.getInitDataSize(chainId);
  console.error(`Initial data size: ${initDataSize}`);
  console.error(`Initial data root: ${initDataRoot.toString('hex')}`);
  console.error(`Initial null root: ${initNullRoot.toString('hex')}`);
  console.error(`Initial root root: ${initRootsRoot.toString('hex')}`);

  const uniswapRouter = await deployUniswap(signer);

  const verifier = vk ? await deployVerifier(signer, vk) : await deployMockVerifier(signer);

  const defiProxy = await deployDefiBridgeProxy(signer);
  const allowThirdPartyContracts = true;
  const rollup = await deployRollupProcessor(
    signer,
    verifier,
    defiProxy,
    escapeHatchBlockLower,
    escapeHatchBlockUpper,
    initDataRoot,
    initNullRoot,
    initRootsRoot,
    initDataSize,
    allowThirdPartyContracts,
  );

  const feeDistributor = await deployFeeDistributor(signer, rollup, uniswapRouter);

  const erc20Assets = await deployErc20Contracts(signer, rollup);
  const [erc20Asset] = erc20Assets;

  const gasPrice = 20n * 10n ** 9n; // 20 gwei
  const daiPrice = 1n * 10n ** 15n; // 1000 DAI/ETH
  const initialTokenSupply = (initialEthSupply * 10n ** 18n) / daiPrice;
  await createUniswapPair(signer, uniswapRouter, erc20Asset, initialTokenSupply, initialEthSupply);

  const priceFeeds = [await deployPriceFeed(signer, gasPrice), await deployPriceFeed(signer, daiPrice)];

  await deployBridgeContracts(signer, rollup, uniswapRouter, erc20Assets);

  const feePayingAssets = [EthAddress.ZERO.toString(), erc20Asset.address];

  if (feePayingAssets.length !== priceFeeds.length) {
    throw new Error('There should be one price feed per fee paying asset.');
  }

  return { rollup, priceFeeds, feeDistributor, feePayingAssets };
}
