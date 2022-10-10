import { Signer } from 'ethers';
import { ethers } from 'hardhat';

export const setupPriceFeeds = async (publisher: Signer, initialPrices = [1n]) => {
  const MockPriceFeed = await ethers.getContractFactory('MockPriceFeed', publisher);
  return await Promise.all(initialPrices.map(initialPrice => MockPriceFeed.deploy(initialPrice)));
};
