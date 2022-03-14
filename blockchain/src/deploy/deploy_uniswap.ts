import UniswapV2FactoryJson from '@uniswap/v2-core/build/UniswapV2Factory.json';
import UniswapV2PairJson from '@uniswap/v2-core/build/UniswapV2Pair.json';
import IWETH from '@uniswap/v2-periphery/build/IWETH.json';
import UniswapV2Router02Json from '@uniswap/v2-periphery/build/UniswapV2Router02.json';
import UniswapBridge from '../artifacts/contracts/bridges/UniswapBridge.sol/UniswapBridge.json';
import { EthAddress } from '@aztec/barretenberg/address';
import { Contract, ContractFactory, Signer } from 'ethers';
import WETH9 from '../abis/WETH9.json';

const gasLimit = 5000000;

export const createUniswapPair = async (
  owner: Signer,
  router: Contract,
  asset: Contract,
  initialTokenSupply = 1000n * 10n ** 18n,
  initialEthSupply = 10n ** 18n,
) => {
  const factory = new Contract(await router.factory(), UniswapV2FactoryJson.abi, owner);
  const weth = new Contract(await router.WETH(), IWETH.abi, owner);

  if (!EthAddress.fromString(await factory.getPair(asset.address, weth.address)).equals(EthAddress.ZERO)) {
    console.error(`UniswapPair [${await asset.name()} - WETH] already created.`);
    return;
  }

  console.error(`Creating UniswapPair: ${await asset.name()} / WETH...`);
  {
    const tx = await factory.createPair(asset.address, weth.address, { gasLimit });
    // Deployment sync point. We need the pair to exist to call getPair().
    await tx.wait();
  }
  const pairAddress = await factory.getPair(asset.address, weth.address);
  const pair = new Contract(pairAddress, UniswapV2PairJson.abi, owner);
  console.error(`UniswapPair contract address: ${pairAddress}`);

  await asset.mint(pair.address, initialTokenSupply, { gasLimit });
  await weth.deposit({ value: initialEthSupply, gasLimit });
  await weth.transfer(pair.address, initialEthSupply, { gasLimit });
  await pair.mint(await owner.getAddress(), { gasLimit });

  console.error(`Initial token supply: ${initialTokenSupply}`);
  console.error(`Initial ETH supply: ${initialEthSupply}`);
};

export const deployUniswap = async (owner: Signer) => {
  console.error('Deploying UniswapFactory...');
  const UniswapFactory = new ContractFactory(UniswapV2FactoryJson.abi, UniswapV2FactoryJson.bytecode, owner);
  const factory = await UniswapFactory.deploy(await owner.getAddress());
  console.error(`UniswapFactory contract address: ${factory.address}`);

  console.error('Deploying WETH...');
  const WETHFactory = new ContractFactory(WETH9.abi, WETH9.bytecode, owner);
  const weth = await WETHFactory.deploy();
  console.error(`WETH contract address: ${weth.address}`);

  console.error('Deploying UniswapV2Router...');
  const UniswapV2Router = new ContractFactory(UniswapV2Router02Json.abi, UniswapV2Router02Json.bytecode, owner);
  const router = await UniswapV2Router.deploy(factory.address, weth.address);
  console.error(`UniswapV2Router contract address: ${router.address}`);

  return router;
};

export const deployUniswapBridge = async (signer: Signer, rollupProcessor: Contract, uniswapRouter: Contract) => {
  console.error('Deploying UniswapBridge...');
  const defiBridgeLibrary = new ContractFactory(UniswapBridge.abi, UniswapBridge.bytecode, signer);
  const defiBridge = await defiBridgeLibrary.deploy(rollupProcessor.address, uniswapRouter.address);
  console.error(`UniswapBridge contract address: ${defiBridge.address}`);
  return defiBridge;
};
