import UniswapV2FactoryJson from '@uniswap/v2-core/build/UniswapV2Factory.json';
import UniswapV2PairJson from '@uniswap/v2-core/build/UniswapV2Pair.json';
import UniswapV2Router02Json from '@uniswap/v2-periphery/build/UniswapV2Router02.json';
import { EthAddress } from '@aztec/barretenberg/address';
import { Asset } from '@aztec/barretenberg/blockchain';
import { randomBytes } from 'crypto';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import WETH9 from '../../../abis/WETH9.json';

async function createPair(owner: Signer, factory: Contract, asset: Asset, weth: Contract, initialTotalSupply: bigint) {
  const assetAddress = asset.getStaticInfo().address.toString();
  let pair = await factory.getPair(assetAddress, weth.address);

  if (!EthAddress.fromString(pair).equals(EthAddress.ZERO)) {
    return new Contract(pair, UniswapV2PairJson.abi, owner);
  }

  await factory.createPair(assetAddress, weth.address);
  pair = await factory.getPair(assetAddress, weth.address);
  const contract = new Contract(pair, UniswapV2PairJson.abi, owner);

  await asset.mint(initialTotalSupply, EthAddress.fromString(contract.address), {
    signingAddress: EthAddress.fromString(await owner.getAddress()),
  });

  await weth.deposit({ value: initialTotalSupply });
  await weth.transfer(contract.address, initialTotalSupply);

  const initialSupplyOwner = randomBytes(20).toString('hex');
  await contract.mint(initialSupplyOwner);
  return contract;
}

export async function setupUniswap(owner: Signer) {
  const UniswapFactory = await ethers.getContractFactory(
    UniswapV2FactoryJson.abi,
    UniswapV2FactoryJson.bytecode,
    owner,
  );
  const uniswapFactory = await UniswapFactory.deploy(await owner.getAddress());

  const WETHFactory = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, owner);
  const weth = await WETHFactory.deploy();

  const UniswapV2Router = await ethers.getContractFactory(
    UniswapV2Router02Json.abi,
    UniswapV2Router02Json.bytecode,
    owner,
  );
  const uniswapRouter = await UniswapV2Router.deploy(uniswapFactory.address, weth.address);

  return {
    uniswapRouter,
    createPair: async (asset: Asset, initialTotalSupply = 10n ** 18n) =>
      createPair(owner, uniswapFactory, asset, weth, initialTotalSupply),
  };
}
