import {
  AssetId,
  createEthSdk,
  EthereumSdk,
  EthereumSdkUser,
  EthAddress,
  EthersAdapter,
  WalletProvider,
} from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { JsonRpcProvider } from '@ethersproject/providers';
import { randomBytes } from 'crypto';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end tests', () => {
  let sdk: EthereumSdk;
  const userAddresses: EthAddress[] = [];
  let users: EthereumSdkUser[];
  const assetId = AssetId.DAI;

  beforeAll(async () => {
    // Init sdk.
    const ethereumProvider = new EthersAdapter(new JsonRpcProvider(ETHEREUM_HOST));

    const walletProvider = new WalletProvider(ethereumProvider);
    for (let i = 0; i < 4; ++i) {
      userAddresses[i] = walletProvider.addAccount(randomBytes(32));
    }

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
    const depositValue = user0Asset.toErc20Units('1000');

    await user0Asset.mint(depositValue);
    await user0Asset.approve(depositValue);
    expect(await user0Asset.publicBalance()).toBe(depositValue);
    expect(await user0Asset.publicAllowance()).toBe(depositValue);
    expect(user0Asset.balance()).toBe(0n);

    const txHash = await user0Asset.deposit(depositValue);
    await sdk.awaitSettlement(userAddresses[0], txHash, 300);

    expect(await user0Asset.publicBalance()).toBe(0n);
    const user0BalanceAfterDeposit = user0Asset.balance();
    expect(user0BalanceAfterDeposit).toBe(depositValue);

    // Transfer to user 1.
    const transferValue = user0Asset.toErc20Units('800');
    expect(user1Asset.balance()).toBe(0n);

    const transferTxHash = await user0Asset.transfer(transferValue, users[1].getUserData().publicKey);
    await sdk.awaitSettlement(userAddresses[0], transferTxHash, 300);
    expect(user0Asset.balance()).toBe(user0BalanceAfterDeposit - transferValue);

    await sdk.awaitSettlement(userAddresses[1], transferTxHash, 300);
    const user1BalanceAfterTransfer = user1Asset.balance();
    expect(user1BalanceAfterTransfer).toBe(transferValue);

    // Withdraw to user 1.
    const withdrawValue = user0Asset.toErc20Units('300');

    const withdrawTxHash = await user1Asset.withdraw(withdrawValue);
    await sdk.awaitSettlement(users[1].getUserData().ethAddress, withdrawTxHash, 300);

    expect(await user1Asset.publicBalance()).toBe(withdrawValue);
    expect(user1Asset.balance()).toBe(user1BalanceAfterTransfer - withdrawValue);
  });
});
