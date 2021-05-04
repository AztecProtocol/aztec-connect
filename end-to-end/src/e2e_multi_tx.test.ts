import { AssetId, createWalletSdk, EthAddress, TxType, WalletProvider, WalletSdk, WalletSdkUser } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

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

describe('end-to-end multi tx tests', () => {
  let provider: WalletProvider;
  let sdk: WalletSdk;
  let accounts: EthAddress[] = [];
  const users: WalletSdkUser[] = [];
  const assetId = AssetId.ETH;

  const deposit = async (userIndex: number, amount: bigint) => {
    const userAsset = users[userIndex].getAsset(assetId);
    const depositor = accounts[userIndex];
    const depositFee = await sdk.getFee(assetId, TxType.DEPOSIT);
    const schnorrSigner = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[userIndex])!);
    await sdk.depositFundsToContract(assetId, depositor, amount + depositFee);
    const proofOutput = await userAsset.createDepositProof(amount, depositFee, schnorrSigner, depositor);
    const signature = await sdk.signProof(proofOutput, depositor);
    return sdk.sendProof(proofOutput, signature);
  };

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
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit to three accounts', async () => {
    expect(users[0].getAsset(assetId).balance()).toBe(0n);
    expect(users[1].getAsset(assetId).balance()).toBe(0n);
    expect(users[2].getAsset(assetId).balance()).toBe(0n);

    const tx1Hash = await deposit(0, 1n);
    const tx2Hash = await deposit(1, 2n);
    const tx3Hash = await deposit(2, 3n);

    await sdk.awaitSettlement(tx1Hash, 300);
    await sdk.awaitSettlement(tx2Hash, 300);
    await sdk.awaitSettlement(tx3Hash, 300);

    await sdk.awaitUserSynchronised(users[0].id);
    await sdk.awaitUserSynchronised(users[1].id);
    await sdk.awaitUserSynchronised(users[2].id);

    expect(users[0].getAsset(assetId).balance()).toBe(1n);
    expect(users[1].getAsset(assetId).balance()).toBe(2n);
    expect(users[2].getAsset(assetId).balance()).toBe(3n);
  });
});
