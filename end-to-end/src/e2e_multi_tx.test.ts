import { AssetId, createWalletSdk, WalletSdk, WalletSdkUser, EthAddress, WalletProvider, TxType } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { getFeeDistributorContract } from './fee_distributor_contract';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

/**
 * Run the following:
 * blockchain: yarn start:ganache
 * halloumi: yarn start:dev
 * falafel: yarn start:e2e
 * end-to-end: yarn test ./src/e2e_multi_tx.test.ts
 */

describe('end-to-end wallet tests', () => {
  let provider: WalletProvider;
  let sdk: WalletSdk;
  let accounts: EthAddress[] = [];
  const users: WalletSdkUser[] = [];
  const assetId = AssetId.ETH;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 4, '2');
    accounts = provider.getAccounts();

    sdk = await createWalletSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    for (let i = 0; i < accounts.length; i++) {
      const user = await sdk.addUser(provider.getPrivateKeyForAddress(accounts[i])!);
      users.push(user);
    }

    const {
      blockchainStatus: { rollupContractAddress },
    } = await sdk.getRemoteStatus();
    await getFeeDistributorContract(rollupContractAddress, provider, accounts[2]);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit to three accounts', async () => {
    const user0Asset = users[0].getAsset(assetId);
    const txFee = await sdk.getFee(assetId, TxType.DEPOSIT);

    expect(user0Asset.balance()).toBe(0n);
    const schnorrSigner0 = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[0])!);
    const schnorrSigner1 = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[1])!);
    const schnorrSigner2 = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[2])!);

    const tx1Hash = await sdk.deposit(AssetId.ETH, accounts[0], users[0].id, 1n, txFee, schnorrSigner0);
    const tx2Hash = await sdk.deposit(AssetId.ETH, accounts[1], users[1].id, 2n, txFee, schnorrSigner1);
    const tx3Hash = await sdk.deposit(AssetId.ETH, accounts[2], users[2].id, 3n, txFee, schnorrSigner2);

    await sdk.awaitSettlement(tx1Hash, 300);
    await sdk.awaitSettlement(tx2Hash, 300);
    await sdk.awaitSettlement(tx3Hash, 300);
    await sdk.awaitUserSynchronised(users[0].id);
    await sdk.awaitUserSynchronised(users[1].id);
    await sdk.awaitUserSynchronised(users[2].id);

    const user0Balance = await sdk.getBalance(AssetId.ETH, users[0].id);
    const user1Balance = await sdk.getBalance(AssetId.ETH, users[1].id);
    const user2Balance = await sdk.getBalance(AssetId.ETH, users[2].id);

    expect(user0Balance).toEqual(1n);
    expect(user1Balance).toEqual(2n);
    expect(user2Balance).toEqual(3n);
  });
});
