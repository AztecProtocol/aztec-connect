import { Signer } from 'ethers';
import { deployMockPriceFeed } from '../../../deploy/deployers/index.js';

export const setupPriceFeeds = async (publisher: Signer, initialPrices = [1n]) => {
  return await Promise.all(initialPrices.map(initialPrice => deployMockPriceFeed(publisher, initialPrice)));
};
