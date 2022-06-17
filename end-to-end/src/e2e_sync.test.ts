import { AztecSdk, createAztecSdk, EthersAdapter, WalletProvider } from '@aztec/sdk';
import { JsonRpcProvider } from '@ethersproject/providers';
import { EventEmitter } from 'events';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
} = process.env;

/**
 * Not really a test. But provides a convienient way of analysing a startup sync.
 * Run falafel pointing it to an ethereum node with a load of data on it.
 * Then run this test and watch it sync.
 */

describe('end-to-end sync tests', () => {
  let sdk: AztecSdk;

  beforeAll(async () => {
    const ethersProvider = new JsonRpcProvider(ETHEREUM_HOST);
    const ethereumProvider = new EthersAdapter(ethersProvider);
    const walletProvider = new WalletProvider(ethereumProvider);
    if (PRIVATE_KEY) {
      walletProvider.addAccount(Buffer.from(PRIVATE_KEY, 'hex'));
    }

    sdk = await createAztecSdk(walletProvider, {
      serverUrl: ROLLUP_HOST,
      memoryDb: true,
      minConfirmation: 1,
    });

    if (PRIVATE_KEY) {
      const keyPair = await sdk.generateAccountKeyPair(walletProvider.getAccount(0), walletProvider);
      await sdk.addUser(keyPair.privateKey);
    }

    await sdk.run();
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should sync', async () => {
    await sdk.awaitSynchronised();
  });
});
