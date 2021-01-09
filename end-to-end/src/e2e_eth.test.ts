import { AssetId, createEthSdk, EthereumSdk, EthereumSdkUser, EthAddress } from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end eth tests', () => {
  let sdk: EthereumSdk;
  let userAddresses: EthAddress[];
  let users: EthereumSdkUser[];
  const assetId = AssetId.ETH;

  beforeAll(async () => {
    const walletProvider = await createFundedWalletProvider(ETHEREUM_HOST, 2, '10');
    userAddresses = walletProvider.getAccounts();

    // Init sdk.
    sdk = await createEthSdk(walletProvider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    users = await Promise.all(
      userAddresses.map(async address => {
        return sdk.addUser(address);
      }),
    );
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const user0Asset = users[0].getAsset(assetId);
    const user1Asset = users[1].getAsset(assetId);

    // Deposit to user 0.
    const depositValue = user0Asset.toErc20Units('8');
    const user0PublicBalanceInitial = await user0Asset.publicBalance();
    expect(user0Asset.balance()).toBe(0n);

    const txHash = await user0Asset.deposit(depositValue);
    await sdk.awaitSettlement(txHash, 300);

    const user0PublicBalanceAfterDeposit = await user0Asset.publicBalance();
    const expectedPublicBalance = user0PublicBalanceInitial - depositValue;
    expect(user0PublicBalanceAfterDeposit < expectedPublicBalance).toBe(true); // Minus gas cost.
    expect(user0Asset.balance()).toBe(depositValue);

    // Withdraw to user 1.
    const withdrawValue = user0Asset.toErc20Units('3');
    const user1PublicBalanceInitial = await user1Asset.publicBalance();

    const withdrawTxHash = await user0Asset.withdraw(withdrawValue, userAddresses[1]);
    await sdk.awaitSettlement(withdrawTxHash, 300);

    const user1PublicBalanceAfterWithdraw = await user1Asset.publicBalance();
    expect(user1PublicBalanceAfterWithdraw).toBe(user1PublicBalanceInitial + withdrawValue);
    expect(user0Asset.balance()).toBe(depositValue - withdrawValue);
    expect(user1Asset.balance()).toBe(0n);
  });
});
