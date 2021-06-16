import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import WETH9 from '../../src/contracts/WETH9.json';

export interface TokenAsset {
  id: number;
  contract: Contract;
}

export const createWeth = async (publisher: Signer) => {
  const WETHFactory = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, publisher);
  return WETHFactory.deploy();
};

export const createAssets = async (publisher: Signer, users: Signer[], mintAmount: bigint, numAssets = 1) => {
  const ERC20 = await ethers.getContractFactory('ERC20Mintable', publisher);
  const assets: Contract[] = [];
  for (let i = 0; i < numAssets; ++i) {
    const asset = await ERC20.deploy();
    assets.push(asset);

    await asset.mint(await publisher.getAddress(), mintAmount);
    for (const user of users) {
      const userAddress = await user.getAddress();
      await asset.mint(userAddress, mintAmount);
    }
  }

  return assets;
};
