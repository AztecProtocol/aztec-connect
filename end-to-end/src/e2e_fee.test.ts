import { AssetId, createEthSdk, EthereumSdk, EthereumSdkUser, EthAddress } from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end transaction fee tests', () => {
  let sdk: EthereumSdk;
  let userAddresses: EthAddress[] = [];
  const users: EthereumSdkUser[] = [];
  const assetId = AssetId.ETH;

  beforeAll(async () => {
    const walletProvider = await createFundedWalletProvider(ETHEREUM_HOST, 2);
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

  it('should process transactions with fee', async () => {
    const user0Asset = users[0].getAsset(assetId);
    const user1Asset = users[1].getAsset(assetId);
    const txFee = user0Asset.toErc20Units('0.1');

    // Deposit to user 0.
    const depositValue = user0Asset.toErc20Units('0.7');
    const user0PublicBalanceInitial = await user0Asset.publicBalance();
    expect(user0Asset.balance()).toBe(0n);

    const txHash = await user0Asset.deposit(depositValue, undefined, undefined, { txFee });
    await sdk.awaitSettlement(txHash, 300);

    const user0PublicBalanceAfterDeposit = await user0Asset.publicBalance();
    const expectedPublicBalanceAfterDeposit = user0PublicBalanceInitial - depositValue - txFee;
    expect(user0PublicBalanceAfterDeposit < expectedPublicBalanceAfterDeposit).toBe(true); // Minus gas cost.

    const user0BalanceAfterDeposit = user0Asset.balance();
    expect(user0BalanceAfterDeposit).toBe(depositValue);

    // Transfer to user 1.
    const transferValue = user0Asset.toErc20Units('0.5');
    expect(user1Asset.balance()).toBe(0n);
    const transferTxHash = await user0Asset.transfer(transferValue, users[1].getUserData().id, undefined, {
      txFee,
    });
    await sdk.awaitSettlement(transferTxHash, 300);

    const user0PublicBalanceAfterTransfer = await user0Asset.publicBalance();
    const expectedPublicBalanceAfterTransfer = user0PublicBalanceAfterDeposit - txFee;
    expect(user0PublicBalanceAfterTransfer < expectedPublicBalanceAfterTransfer).toBe(true); // Minus gas cost.

    const user0BalanceAfterTransfer = user0Asset.balance();
    expect(user0BalanceAfterTransfer).toBe(user0BalanceAfterDeposit - transferValue);

    const user1BalanceAfterTransfer = user1Asset.balance();
    expect(user1BalanceAfterTransfer).toBe(transferValue);

    // Withdraw to user 1.
    const user1PublicBalanceBeforeWithdraw = await user1Asset.publicBalance();

    const withdrawValue = user0Asset.toErc20Units('0.3');
    const withdrawTxHash = await user1Asset.withdraw(withdrawValue, undefined, undefined, {
      txFee,
      payTxFeeByPrivateAsset: true,
    });
    await sdk.awaitSettlement(withdrawTxHash, 300);

    const user1PublicBalanceAfterWithdraw = await user1Asset.publicBalance();
    expect(user1PublicBalanceAfterWithdraw > user1PublicBalanceBeforeWithdraw).toBe(true);
    expect(user1PublicBalanceAfterWithdraw).toBe(user1PublicBalanceBeforeWithdraw + withdrawValue);

    const user1BalanceAfterWithdraw = user1Asset.balance();
    expect(user1BalanceAfterWithdraw).toBe(user1BalanceAfterTransfer - withdrawValue - txFee);
  });
});
