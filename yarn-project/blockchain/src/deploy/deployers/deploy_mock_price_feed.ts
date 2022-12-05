import { ContractFactory, Signer } from 'ethers';
import { MockPriceFeed } from '../../abis.js';

export async function deployMockPriceFeed(signer: Signer, initialPrice = BigInt(10) ** BigInt(18)) {
  console.log('Deploying MockPriceFeed...');
  const priceFeedLibrary = new ContractFactory(MockPriceFeed.abi, MockPriceFeed.bytecode, signer);
  const priceFeed = await priceFeedLibrary.deploy(initialPrice);
  console.log(`MockPriceFeed contract address: ${priceFeed.address}. Initial price: ${initialPrice}.`);

  return priceFeed;
}
