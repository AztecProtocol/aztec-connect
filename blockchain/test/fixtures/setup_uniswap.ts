import UniswapV2FactoryJson from '@uniswap/v2-core/build/UniswapV2Factory.json';
import UniswapV2PairJson from '@uniswap/v2-core/build/UniswapV2Pair.json';
import UniswapV2Router02Json from '@uniswap/v2-periphery/build/UniswapV2Router02.json';
import { EthAddress } from '@aztec/barretenberg/address';
import { randomBytes } from 'crypto';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { TokenAsset } from './assets';

export interface Pair {
  contract: Contract;
  asset: TokenAsset;
}

export const createPair = async (
  owner: Signer,
  factory: Contract,
  asset: TokenAsset,
  weth: Contract,
  initialTotalSupply: bigint,
) => {
  let pair = await factory.getPair(asset.contract.address, weth.address);
  const createNew = EthAddress.fromString(pair).equals(EthAddress.ZERO);
  if (createNew) {
    await factory.createPair(asset.contract.address, weth.address);
    pair = await factory.getPair(asset.contract.address, weth.address);
  }
  const contract = new Contract(pair, UniswapV2PairJson.abi, owner);
  if (createNew) {
    await asset.contract.mint(contract.address, initialTotalSupply);

    await weth.deposit({ value: initialTotalSupply });
    await weth.transfer(contract.address, initialTotalSupply);

    const initialSupplyOwner = randomBytes(20).toString('hex');
    await contract.mint(initialSupplyOwner);
  }

  return {
    contract,
    asset,
  };
};

export const setupUniswap = async (owner: Signer, weth: Contract) => {
  const UniswapFactory = await ethers.getContractFactory(
    UniswapV2FactoryJson.abi,
    UniswapV2FactoryJson.bytecode,
    owner,
  );
  const factory = await UniswapFactory.deploy(await owner.getAddress());

  const UniswapV2Router = await ethers.getContractFactory(
    UniswapV2Router02Json.abi,
    UniswapV2Router02Json.bytecode,
    owner,
  );
  const router = await UniswapV2Router.deploy(factory.address, weth.address);

  return {
    factory,
    router,
    createPair: async (asset: TokenAsset, initialTotalSupply = 10n ** 18n) =>
      createPair(owner, factory, asset, weth, initialTotalSupply),
  };
};
