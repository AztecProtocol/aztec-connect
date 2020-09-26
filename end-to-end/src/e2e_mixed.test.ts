import 'fake-indexeddb/auto';

import { AssetId, EthereumSdk } from 'aztec2-sdk';
import { EthAddress } from 'barretenberg/address';
import { EventEmitter } from 'events';
import { Eth } from 'web3x/eth';
import { HttpProvider } from 'web3x/providers';
import { advanceBlocks, blocksToAdvance } from './manipulate_block';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  SRIRACHA_HOST = 'http://localhost:8082',
  ROLLUP_HOST = 'http://localhost:8081',
} = process.env;

describe('end-to-end falafel recovery tests', () => {
  let provider: HttpProvider;
  let userAddress: EthAddress;
  const assetId = AssetId.DAI;

  beforeAll(async () => {
    provider = new HttpProvider(ETHEREUM_HOST);
    // Get users addresses.
    const eth = new Eth(provider);
    const account = (await eth.getAccounts())[0];
    userAddress = new EthAddress(account.toBuffer());
  });

  it('should succesfully mix normal and escape mode transactions', async () => {
    // Run a normal sdk and deposit.
    {
      const sdk = new EthereumSdk((provider as any).provider);

      await sdk.init(ROLLUP_HOST, {
        syncInstances: false,
        clearDb: true,
        saveProvingKey: false,
      });
      const user = await sdk.addUser(userAddress);
      await sdk.awaitSynchronised();

      const userAsset = user.getAsset(assetId);
      const depositValue = 1000n;

      await userAsset.mint(depositValue);
      await userAsset.approve(depositValue);

      const txHash = await userAsset.deposit(depositValue);
      await sdk.awaitSettlement(userAddress, txHash);

      expect(userAsset.balance()).toBe(depositValue);
      await sdk.destroy();
    }

    // Run an escape sdk and withdraw half.
    {
      const nextEscapeBlock = await blocksToAdvance(81, 100, provider);
      await advanceBlocks(nextEscapeBlock, provider);

      const sdk = new EthereumSdk((provider as any).provider);
      await sdk.init(SRIRACHA_HOST, {
        syncInstances: false,
        clearDb: true,
        escapeHatchMode: true,
        saveProvingKey: false,
      });
      const user = await sdk.addUser(userAddress);
      await sdk.awaitSynchronised();

      const userAsset = user.getAsset(assetId);

      const txHash = await userAsset.withdraw(500n);
      await sdk.awaitSettlement(userAddress, txHash);

      expect(await userAsset.publicBalance()).toBe(500n);
      expect(userAsset.balance()).toBe(500n);

      await sdk.destroy();
    }

    {
      // Run a normal sdk and withdraw half.
      const sdk = new EthereumSdk((provider as any).provider);
      await sdk.init(ROLLUP_HOST, {
        syncInstances: false,
        clearDb: true,
        escapeHatchMode: false,
        saveProvingKey: false,
      });
      const user = await sdk.addUser(userAddress);
      await sdk.awaitSynchronised();

      const userAsset = user.getAsset(assetId);

      const txHash = await userAsset.withdraw(500n);
      await sdk.awaitSettlement(userAddress, txHash);

      expect(await userAsset.publicBalance()).toBe(1000n);
      expect(userAsset.balance()).toBe(0n);

      await sdk.destroy();
    }
  });
});
