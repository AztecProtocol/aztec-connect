import { AssetId, createEthSdk, EthereumSdk, EthereumSdkUser } from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { advanceBlocks, blocksToAdvance } from './manipulate_block';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', SRIRACHA_HOST = 'http://localhost:8082' } = process.env;

/**
 * Set the following environment variables
 * - before deploying the contracts:
 *   ESCAPE_BLOCK_LOWER=10
 *   ESCAPE_BLOCK_UPPER=100
 * - before running sriracha:
 *   MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW=1
 */

describe('end-to-end escape tests', () => {
  let sdk: EthereumSdk;
  const users: EthereumSdkUser[] = [];
  const assetId = AssetId.DAI;
  const escapeBlockLowerBound = 10;
  const escapeBlockUpperBound = 100;

  beforeAll(async () => {
    // Init sdk.
    const walletProvider = await createFundedWalletProvider(ETHEREUM_HOST, 2, '1');
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

    const nextEscapeBlock = await blocksToAdvance(escapeBlockLowerBound, escapeBlockUpperBound, walletProvider);
    await advanceBlocks(nextEscapeBlock, walletProvider);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const { escapeOpen } = await sdk.getRemoteStatus();
    expect(escapeOpen).toBe(true);

    const user0Asset = users[0].getAsset(assetId);
    const user1Asset = users[1].getAsset(assetId);
    const fee = 0n;

    // Deposit to user 0.
    {
      const depositValue = user0Asset.toBaseUnits('1000');

      await user0Asset.mint(depositValue);
      await user0Asset.approve(depositValue);
      expect(await user0Asset.publicBalance()).toBe(depositValue);
      expect(await user0Asset.publicAllowance()).toBe(depositValue);
      expect(user0Asset.balance()).toBe(0n);

      const txHash = await user0Asset.deposit(depositValue, fee);
      await sdk.awaitSettlement(txHash);

      expect(await user0Asset.publicBalance()).toBe(0n);
      expect(user0Asset.balance()).toBe(depositValue);
    }

    // Transfer to user 1.
    {
      const transferValue = user0Asset.toBaseUnits('800');

      const initialBalance0 = user0Asset.balance();
      const initialBalance1 = user1Asset.balance();

      const transferTxHash = await user0Asset.transfer(transferValue, fee, users[1].getUserData().id);
      await sdk.awaitSettlement(transferTxHash);

      expect(user0Asset.balance()).toBe(initialBalance0 - transferValue);
      expect(user1Asset.balance()).toBe(initialBalance1 + transferValue);
    }

    // Withdraw to user 1.
    {
      const withdrawValue = user0Asset.toBaseUnits('300');

      const initialPublicBalance = await user1Asset.publicBalance();
      const initialBalance = user1Asset.balance();

      const withdrawTxHash = await user1Asset.withdraw(withdrawValue, fee);
      await sdk.awaitSettlement(withdrawTxHash);

      expect(await user1Asset.publicBalance()).toBe(initialPublicBalance + withdrawValue);
      expect(user1Asset.balance()).toBe(initialBalance - withdrawValue);
    }
  });
});
