import { EthAddress } from '@aztec/barretenberg/address';
import { randomBytes } from 'crypto';
import { Contract, Wallet, ethers } from 'ethers';
import ganache, { Server } from 'ganache';
import { TokenPriceFeed } from '.';
import { EthersAdapter, WalletProvider } from '../../provider';
import { setupPriceFeeds } from './fixtures/setup_price_feeds';

describe('price_feed', () => {
  let priceFeedContract: Contract;
  let priceFeed: TokenPriceFeed;
  const initialPrice = 100n;

  let snapshot: string;
  let rpcProvider: ethers.providers.JsonRpcProvider;
  let server: Server<'ethereum'>;

  beforeAll(async () => {
    server = ganache.server({ logging: { quiet: true } });
    const PORT = 8541;
    // eslint-disable-next-line require-await
    server.listen(PORT, async err => {
      if (err) throw err;
    });
    rpcProvider = new ethers.providers.JsonRpcProvider(`http://127.0.0.1:${PORT}`);
    const provider = new EthersAdapter(rpcProvider);
    const localUser = new Wallet(randomBytes(32));
    const ethereumProvider = new WalletProvider(provider);
    ethereumProvider.addAccount(Buffer.from(localUser.privateKey.slice(2), 'hex'));

    const signers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(index => rpcProvider.getSigner(index));

    const [publisher] = signers;
    [priceFeedContract] = await setupPriceFeeds(publisher, [initialPrice]);
    priceFeed = new TokenPriceFeed(EthAddress.fromString(priceFeedContract.address), ethereumProvider);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    snapshot = await rpcProvider.send('evm_snapshot', []);
  });

  afterEach(async () => {
    await rpcProvider.send('evm_revert', [snapshot]);
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
