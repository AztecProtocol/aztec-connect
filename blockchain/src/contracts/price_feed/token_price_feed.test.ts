import { EthAddress } from '@aztec/barretenberg/address';
import { randomBytes } from 'crypto';
import { Contract, Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { TokenPriceFeed } from '.';
import { evmSnapshot, evmRevert } from '../../ganache/hardhat-chain-manipulation';
import { EthersAdapter, WalletProvider } from '../../provider';
import { setupPriceFeeds } from './fixtures/setup_price_feeds';

describe('price_feed', () => {
  let priceFeedContract: Contract;
  let priceFeed: TokenPriceFeed;
  const initialPrice = 100n;

  let snapshot: string;

  beforeAll(async () => {
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
    expect(await priceFeed.price()).toBe(initialPrice);
  });

  it('get latest round', async () => {
    const latestRound = await priceFeedContract.latestRound();
    expect(await priceFeed.latestRound()).toBe(BigInt(latestRound.toNumber()));
  });

  it('get historical price', async () => {
    const initialRound = await priceFeed.latestRound();
    expect(await priceFeed.getHistoricalPrice(initialRound)).toBe(100n);
    expect(await priceFeed.getHistoricalPrice(initialRound + 1n)).toBe(0n);

    await priceFeedContract.setRoundData(123n);

    expect(await priceFeed.latestRound()).toBe(initialRound + 1n);
    expect(await priceFeed.getHistoricalPrice(initialRound)).toBe(100n);
    expect(await priceFeed.getHistoricalPrice(initialRound + 1n)).toBe(123n);
  });

  it('get round data', async () => {
    const latestRound = await priceFeedContract.latestRound();
    const roundData = (await priceFeed.getRoundData(latestRound))!;
    expect(roundData).toEqual(
      expect.objectContaining({
        roundId: latestRound,
        price: initialPrice,
      }),
    );
    expect(roundData.timestamp).toBeGreaterThan(0);
  });

  it('return 0s if round does not exist', async () => {
    const roundId = (await priceFeed.latestRound()) + 1n;
    expect(await priceFeed.getRoundData(roundId)).toEqual({
      roundId,
      price: 0n,
      timestamp: 0,
    });
  });
});
