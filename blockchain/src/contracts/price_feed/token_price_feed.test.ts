// eslint-disable-next-line @typescript-eslint/no-var-requires
const { solidity } = require('ethereum-waffle');
import chai from 'chai';

import { expect } from 'chai';
chai.use(solidity);

import { EthAddress } from '@aztec/barretenberg/address';
import { randomBytes } from 'crypto';
import { Contract, Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { TokenPriceFeed } from '.';
import { evmSnapshot, evmRevert } from '../../ganache/hardhat_chain_manipulation';
import { EthersAdapter, WalletProvider } from '../../provider';
import { setupPriceFeeds } from './fixtures/setup_price_feeds';

describe('price_feed', () => {
  let priceFeedContract: Contract;
  let priceFeed: TokenPriceFeed;
  const initialPrice = 100n;

  let snapshot: string;

  before(async () => {
    const localUser = new Wallet(randomBytes(32));
    const ethereumProvider = new WalletProvider(new EthersAdapter(ethers.provider));
    ethereumProvider.addAccount(Buffer.from(localUser.privateKey.slice(2), 'hex'));

    const [publisher] = await ethers.getSigners();
    [priceFeedContract] = await setupPriceFeeds(publisher, [initialPrice]);
    priceFeed = new TokenPriceFeed(EthAddress.fromString(priceFeedContract.address), ethereumProvider);
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
  });

  it('get latest price and round', async () => {
    expect(await priceFeed.price()).to.be.eq(initialPrice);
  });

  it('get latest round', async () => {
    const latestRound = await priceFeedContract.latestRound();
    expect(await priceFeed.latestRound()).to.be.eq(BigInt(latestRound.toNumber()));
  });

  it('get historical price', async () => {
    const initialRound = await priceFeed.latestRound();
    expect(await priceFeed.getHistoricalPrice(initialRound)).to.be.eq(100n);
    expect(await priceFeed.getHistoricalPrice(initialRound + 1n)).to.be.eq(0n);

    await priceFeedContract.setRoundData(123n);

    expect(await priceFeed.latestRound()).to.be.eq(initialRound + 1n);
    expect(await priceFeed.getHistoricalPrice(initialRound)).to.be.eq(100n);
    expect(await priceFeed.getHistoricalPrice(initialRound + 1n)).to.be.eq(123n);
  });

  it('get round data', async () => {
    const latestRound = await priceFeedContract.latestRound();
    const roundData = (await priceFeed.getRoundData(latestRound))!;
    expect(roundData).to.include({
      roundId: latestRound,
      price: initialPrice,
    });
    expect(roundData.timestamp).to.be.gt(0);
  });

  it('return 0s if round does not exist', async () => {
    const roundId = (await priceFeed.latestRound()) + 1n;
    expect(await priceFeed.getRoundData(roundId)).to.be.eql({
      roundId,
      price: 0n,
      timestamp: 0,
    });
  });
});
