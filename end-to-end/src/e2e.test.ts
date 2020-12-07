import { AssetId, createEthSdk, EthereumSdk, EthereumSdkUser, EthAddress } from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end tests', () => {
  let sdk: EthereumSdk;
  let userAddresses: EthAddress[] = [];
  const users: EthereumSdkUser[] = [];
  const assetId = AssetId.DAI;

  beforeAll(async () => {
    const walletProvider = await createFundedWalletProvider(ETHEREUM_HOST, 4);
    userAddresses = walletProvider.getAccounts();

    sdk = await createEthSdk(walletProvider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    for (const address of userAddresses) {
      const user = await sdk.addUser(address);
      users.push(user);
    }
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const user0Asset = users[0].getAsset(assetId);
    const user1Asset = users[1].getAsset(assetId);

    // Deposit to user 0.
    const depositValue = user0Asset.toErc20Units('1000');
    await user0Asset.mint(depositValue);
    expect(await user0Asset.publicBalance()).toBe(depositValue);
    expect(user0Asset.balance()).toBe(0n);

    const txHash = await user0Asset.deposit(depositValue);
    await sdk.awaitSettlement(txHash, 300);
    expect(await user0Asset.publicBalance()).toBe(0n);
    const user0BalanceAfterDeposit = user0Asset.balance();
    expect(user0BalanceAfterDeposit).toBe(depositValue);

    // Transfer to user 1.
    const transferValue = user0Asset.toErc20Units('800');
    expect(user1Asset.balance()).toBe(0n);
    const transferTxHash = await user0Asset.transfer(transferValue, users[1].getUserData().id);
    await sdk.awaitSettlement(transferTxHash, 300);

    expect(user0Asset.balance()).toBe(user0BalanceAfterDeposit - transferValue);
    await sdk.awaitSettlement(transferTxHash, 300);
    const user1BalanceAfterTransfer = user1Asset.balance();
    expect(user1BalanceAfterTransfer).toBe(transferValue);

    // Withdraw to user 1.
    const withdrawValue = user0Asset.toErc20Units('300');
    const withdrawTxHash = await user1Asset.withdraw(withdrawValue);
    await sdk.awaitSettlement(withdrawTxHash, 300);
    expect(await user1Asset.publicBalance()).toBe(withdrawValue);
    expect(user1Asset.balance()).toBe(user1BalanceAfterTransfer - withdrawValue);
  });
});
