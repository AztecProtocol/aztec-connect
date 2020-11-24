import { AssetId, createEthSdk, EthAddress, EthereumProvider, EthersAdapter } from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { advanceBlocks, blocksToAdvance } from './manipulate_block';
import { JsonRpcProvider } from '@ethersproject/providers';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  SRIRACHA_HOST = 'http://localhost:8082',
  ROLLUP_HOST = 'http://localhost:8081',
} = process.env;

describe('end-to-end falafel recovery tests', () => {
  let provider: EthereumProvider;
  let userAddress: EthAddress;
  const assetId = AssetId.DAI;

  beforeAll(async () => {
    const jsonRpcProvider = new JsonRpcProvider(ETHEREUM_HOST);
    provider = new EthersAdapter(jsonRpcProvider);

    // Get users addresses.
    userAddress = EthAddress.fromString((await jsonRpcProvider.listAccounts())[0]);
  });

  it('should succesfully mix normal and escape mode transactions', async () => {
    // Run a normal sdk and deposit.
    {
      const sdk = await createEthSdk(provider, ROLLUP_HOST, {
        syncInstances: false,
        saveProvingKey: false,
        clearDb: true,
        dbPath: ':memory:',
      });
      await sdk.init();
      const user = await sdk.addUser(userAddress);
      await sdk.awaitSynchronised();

      const userAsset = user.getAsset(assetId);
      const depositValue = 1000n;

      await userAsset.mint(depositValue);
      await userAsset.approve(depositValue);

      const txHash = await userAsset.deposit(depositValue);
      await sdk.awaitSettlement(txHash);

      expect(userAsset.balance()).toBe(depositValue);
      await sdk.destroy();
    }

    // Run an escape sdk and withdraw half.
    {
      const nextEscapeBlock = await blocksToAdvance(81, 100, provider);
      await advanceBlocks(nextEscapeBlock, provider);

      const sdk = await createEthSdk(provider, SRIRACHA_HOST, {
        syncInstances: false,
        saveProvingKey: false,
        clearDb: true,
        dbPath: ':memory:',
      });
      await sdk.init();
      const user = await sdk.addUser(userAddress);
      await sdk.awaitSynchronised();

      const userAsset = user.getAsset(assetId);

      const txHash = await userAsset.withdraw(500n);
      await sdk.awaitSettlement(txHash);

      expect(await userAsset.publicBalance()).toBe(500n);
      expect(userAsset.balance()).toBe(500n);

      await sdk.destroy();
    }

    {
      // Run a normal sdk and withdraw half.
      const sdk = await createEthSdk(provider, ROLLUP_HOST, {
        syncInstances: false,
        saveProvingKey: false,
        clearDb: true,
        dbPath: ':memory:',
      });
      await sdk.init();
      const user = await sdk.addUser(userAddress);
      await sdk.awaitSynchronised();

      const userAsset = user.getAsset(assetId);

      const txHash = await userAsset.withdraw(500n);
      await sdk.awaitSettlement(txHash);

      expect(await userAsset.publicBalance()).toBe(1000n);
      expect(userAsset.balance()).toBe(0n);

      await sdk.destroy();
    }
  });
});
