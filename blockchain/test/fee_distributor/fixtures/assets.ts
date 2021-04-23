import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';

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
