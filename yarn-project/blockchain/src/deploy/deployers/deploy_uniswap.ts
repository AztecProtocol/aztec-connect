import { EthAddress } from '@aztec/barretenberg/address';
import { Contract, ContractFactory, Signer } from 'ethers';
import {
  IWETH,
  UniswapBridge,
  UniswapV2FactoryJson,
  UniswapV2PairJson,
  UniswapV2Router02Json,
  WETH9,
} from '../../abis.js';

const gasLimit = 5000000;

export const deployUniswapPair = async (
  owner: Signer,
  router: Contract,
  asset: Contract,
  initialTokenSupply = BigInt(1000) * BigInt(10) ** BigInt(18),
  initialEthSupply = BigInt(10) ** BigInt(18),
) => {
  const factory = new Contract(await router.factory(), UniswapV2FactoryJson.abi, owner);
  const weth = new Contract(await router.WETH(), IWETH.abi, owner);

  if (!EthAddress.fromString(await factory.getPair(asset.address, weth.address)).equals(EthAddress.ZERO)) {
    console.log(`UniswapPair [${await asset.name()} - WETH] already created.`);
    return;
  }

  console.log(`Creating UniswapPair: ${await asset.name()} / WETH...`);
  {
    const tx = await factory.createPair(asset.address, weth.address, { gasLimit });
    // Deployment sync point. We need the pair to exist to call getPair().
    await tx.wait();
  }
  const pairAddress = await factory.getPair(asset.address, weth.address);
  const pair = new Contract(pairAddress, UniswapV2PairJson.abi, owner);
  console.log(`UniswapPair contract address: ${pairAddress}`);

  await asset.mint(pair.address, initialTokenSupply, { gasLimit });
  await weth.deposit({ value: initialEthSupply, gasLimit });
  await weth.transfer(pair.address, initialEthSupply, { gasLimit });
  await pair.mint(await owner.getAddress(), { gasLimit });

  console.log(`Initial token supply: ${initialTokenSupply}`);
  console.log(`Initial ETH supply: ${initialEthSupply}`);
};

export const deployUniswap = async (owner: Signer) => {
  console.log('Deploying UniswapFactory...');
  const UniswapFactory = new ContractFactory(UniswapV2FactoryJson.abi, UniswapV2FactoryJson.bytecode, owner);
  const factory = await UniswapFactory.deploy(await owner.getAddress());
  console.log(`UniswapFactory contract address: ${factory.address}`);

  console.log('Deploying WETH...');
  const WETHFactory = new ContractFactory(WETH9.abi, WETH9.bytecode, owner);
  const weth = await WETHFactory.deploy();
  console.log(`WETH contract address: ${weth.address}`);

  console.log('Deploying UniswapV2Router...');
  const UniswapV2Router = new ContractFactory(UniswapV2Router02Json.abi, UniswapV2Router02Json.bytecode, owner);
  const router = await UniswapV2Router.deploy(factory.address, weth.address);
  console.log(`UniswapV2Router contract address: ${router.address}`);

  return router;
};

export const deployUniswapBridge = async (signer: Signer, rollupProcessor: Contract, uniswapRouter: Contract) => {
  console.log('Deploying UniswapBridge...');
  const defiBridgeLibrary = new ContractFactory(UniswapBridge.abi, UniswapBridge.bytecode, signer);
  const defiBridge = await defiBridgeLibrary.deploy(rollupProcessor.address, uniswapRouter.address);
  console.log(`UniswapBridge contract address: ${defiBridge.address}`);
  await rollupProcessor.setSupportedBridge(defiBridge.address, BigInt(300000), { gasLimit });
  return defiBridge;
};
