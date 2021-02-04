import { AssetId, createWalletSdk, WalletSdk, WalletSdkUser, EthAddress, WalletProvider, Web3Signer } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { getFeeDistributorContract } from './fee_distributor_contract';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

/**
 * Set the following environment variables before running falafel:
 *   TX_FEE=100000000000000000
 *   NUM_OUTER_ROLLUP_PROOFS=2
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

  it('should deposit, transfer and withdraw funds', async () => {
    const user0Asset = users[0].getAsset(assetId);
    const txFee = await sdk.getFee(assetId);

    // Deposit to user 0.
    {
      const depositValue = user0Asset.toBaseUnits('0.2');

      expect(user0Asset.balance()).toBe(0n);
      const schnorrSigner0 = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[0])!);
      const schnorrSigner1 = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[1])!);
      const schnorrSigner2 = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[2])!);

      const tx1Hash = await sdk.deposit(
        AssetId.ETH,
        users[0].id,
        depositValue,
        txFee,
        schnorrSigner0,
        new Web3Signer(provider, accounts[0]),
      );
      const tx2Hash = await sdk.deposit(
        AssetId.ETH,
        users[1].id,
        depositValue,
        txFee,
        schnorrSigner1,
        new Web3Signer(provider, accounts[1]),
      );
      const tx3Hash = await sdk.deposit(
        AssetId.ETH,
        users[2].id,
        depositValue,
        txFee,
        schnorrSigner2,
        new Web3Signer(provider, accounts[2]),
      );

      await sdk.awaitSettlement(tx1Hash, 300);
      await sdk.awaitSettlement(tx2Hash, 300);
      await sdk.awaitSettlement(tx3Hash, 300);
      await sdk.awaitUserSynchronised(users[0].id);
      await sdk.awaitUserSynchronised(users[1].id);
      await sdk.awaitUserSynchronised(users[2].id);

      const user0Balance = await sdk.getBalance(AssetId.ETH, users[0].id);
      const user1Balance = await sdk.getBalance(AssetId.ETH, users[1].id);
      const user2Balance = await sdk.getBalance(AssetId.ETH, users[2].id);

      expect(user0Balance).toEqual(depositValue);
      expect(user1Balance).toEqual(depositValue);
      expect(user2Balance).toEqual(depositValue);
    }
  });
});
