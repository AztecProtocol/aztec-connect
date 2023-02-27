import { JsonRpcProvider, AztecSdk, createAztecSdk, WalletProvider, AztecSdkUser } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { jest } from '@jest/globals';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;
Error.stackTraceLimit = 50;

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
  let user: AztecSdkUser;

  beforeAll(async () => {
    const ethereumProvider = new JsonRpcProvider(ETHEREUM_HOST);
    const walletProvider = new WalletProvider(ethereumProvider);
    if (PRIVATE_KEY) {
      walletProvider.addAccount(Buffer.from(PRIVATE_KEY, 'hex'));
    }

    sdk = await createAztecSdk(walletProvider, {
      serverUrl: ROLLUP_HOST,
      memoryDb: true,
      minConfirmation: 1,
      noVersionCheck: true,
    });

    if (PRIVATE_KEY) {
      const keyPair = await sdk.generateAccountKeyPair(walletProvider.getAccount(0), walletProvider);
      user = await sdk.addUser(keyPair.privateKey);
    }

    await sdk.run();
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should sync', async () => {
    await user.awaitSynchronised();
    console.log(`Private balance: ${sdk.fromBaseUnits(await user.getBalance(0), true)}`);
  });
});
