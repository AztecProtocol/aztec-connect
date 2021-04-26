import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { Contract, Wallet } from 'ethers';
import { ethers, network } from 'hardhat';
import { TokenPriceFeed } from '../../src/price_feed';
import { EthersAdapter, WalletProvider } from '../../src/provider';
import { setupPriceFeeds } from './setup_price_feeds';

describe('price_feed', () => {
  let priceFeedContract: Contract;
  let priceFeed: TokenPriceFeed;
  const initialPrice = 100n;

  beforeEach(async () => {
    const localUser = new Wallet(randomBytes(32));
    const ethereumProvider = new WalletProvider(new EthersAdapter(network.provider));
    ethereumProvider.addAccount(Buffer.from(localUser.privateKey.slice(2), 'hex'));
    const provider = new Web3Provider(ethereumProvider);

    const [publisher] = await ethers.getSigners();
    [priceFeedContract] = await setupPriceFeeds(publisher, [initialPrice]);
    priceFeed = new TokenPriceFeed(EthAddress.fromString(priceFeedContract.address), provider);
  });

  it('get latest price and round', async () => {
    expect(await priceFeed.price()).to.equal(initialPrice);
  });

  it('get latest round', async () => {
    const latestRound = await priceFeedContract.latestRound();
    expect(await priceFeed.latestRound()).to.equal(latestRound);
  });

  it('get historical price', async () => {
    const initialRound = await priceFeed.latestRound();
    expect(await priceFeed.getHistoricalPrice(initialRound)).to.equal(100n);
    expect(await priceFeed.getHistoricalPrice(initialRound + 1n)).to.equal(0n);

    await priceFeedContract.setRoundData(123n);

    expect(await priceFeed.latestRound()).to.equal(initialRound + 1n);
    expect(await priceFeed.getHistoricalPrice(initialRound)).to.equal(100n);
    expect(await priceFeed.getHistoricalPrice(initialRound + 1n)).to.equal(123n);
  });

  it('get round data', async () => {
    const latestRound = await priceFeedContract.latestRound();
    const roundData = (await priceFeed.getRoundData(latestRound))!;
    expect(roundData).to.include({
      roundId: latestRound,
      price: initialPrice,
    });
    expect(roundData.timestamp).to.be.greaterThan(0);
  });

  it('return 0s if round does not exist', async () => {
    const roundId = (await priceFeed.latestRound()) + 1n;
    expect(await priceFeed.getRoundData(roundId)).to.eql({
      roundId,
      price: 0n,
      timestamp: 0,
    });
  });
});
