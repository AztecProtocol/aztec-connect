import { AssetId, createEthSdk, EthereumSdk, EthereumSdkUser, EthersAdapter, WalletProvider } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { JsonRpcProvider } from '@ethersproject/providers';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:10545',
  SRIRACHA_HOST = 'https://api.aztec.network/sriracha',
  PRIVATE_KEY,
} = process.env;

/**
 * Set PRIVATE_KEY environment variable to an address key with > 0.1 goerli ETH. No 0x prefix.
 */
describe('testnet escape test', () => {
  let sdk: EthereumSdk;
  const users: EthereumSdkUser[] = [];
  const assetId = AssetId.ETH;

  if (!PRIVATE_KEY) {
    throw new Error('Specify PRIVATE_KEY.');
  }

  beforeAll(async () => {
    const ethersProvider = new JsonRpcProvider(ETHEREUM_HOST);
    const ethereumProvider = new EthersAdapter(ethersProvider);
    const walletProvider = new WalletProvider(ethereumProvider);
    walletProvider.addAccount(Buffer.from(PRIVATE_KEY, 'hex'));
    const accounts = walletProvider.getAccounts();

    sdk = await createEthSdk(walletProvider, SRIRACHA_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    // Get user addresses.
    const userAddresses = accounts.slice(0, 2);
    for (const address of userAddresses) {
      const user = await sdk.addUser(address);
      users.push(user);
    }
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit', async () => {
    const user0Asset = users[0].getAsset(assetId);
    const fee = 0n;

    const depositValue = user0Asset.toBaseUnits('0.1');
    const txHash = await user0Asset.deposit(depositValue, fee);
    await sdk.awaitSettlement(txHash);
  });
});
