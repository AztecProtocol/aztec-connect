import { AccountId, AssetId, createWalletSdk, EthAddress, TxHash, TxType, WalletProvider, WalletSdk } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
} = process.env;

/**
 * If necessary, install ganache-cli: yarn global add ganache-cli
 * Set ETHEREUM_HOST: export ETHEREUM_HOST = http://localhost:8545
 * Run the following:
 * blockchain: yarn start:ganache
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test ./src/e2e.test.ts
 */

describe('end-to-end tests', () => {
  let provider: WalletProvider;
  let sdk: WalletSdk;
  let accounts: EthAddress[] = [];
  const userIds: AccountId[] = [];
  const assetId = AssetId.ETH;
  const awaitSettlementTimeout = 600;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, 1, Buffer.from(PRIVATE_KEY, 'hex'), 10n ** 17n);
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
      userIds.push(user.id);
    }
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const depositValue = 200n;
    const transferValue = 70n;
    const withdrawValue = 80n;

    const sender = userIds[0];
    const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[0])!);

    let depositTxHash: TxHash;
    let transferTxHash: TxHash;
    let withdrawTxHash: TxHash;
    let accumPrivateFee = 0n;

    let initialPublicBalance0: bigint;
    const initialPublicBalance1 = await sdk.getPublicBalance(assetId, accounts[1]);
    expect(sdk.getBalance(assetId, userIds[0])).toBe(0n);
    expect(sdk.getBalance(assetId, userIds[1])).toBe(0n);

    // Deposit to user 0.
    {
      const depositor = accounts[0];
      const txFee = await sdk.getFee(assetId, TxType.DEPOSIT);
      const depositProof = await sdk.createDepositProof(assetId, depositor, userIds[0], depositValue, txFee, signer);
      const depositSignature = await sdk.signProof(depositProof, accounts[0]);

      await expect(sdk.sendProof(depositProof, depositSignature)).rejects.toThrow();

      await sdk.depositFundsToContract(assetId, accounts[0], depositValue + txFee);

      initialPublicBalance0 = await sdk.getPublicBalance(assetId, accounts[0]);
      depositTxHash = await sdk.sendProof(depositProof, depositSignature);
    }

    // Transfer to user 1.
    {
      const recipient = userIds[1];
      const txFee = await sdk.getFee(assetId, TxType.TRANSFER);
      accumPrivateFee += txFee;
      const transferProof = await sdk.createTransferProof(assetId, sender, transferValue, txFee, signer, recipient);
      transferTxHash = await sdk.sendProof(transferProof);
    }

    // Withdraw to user 0.
    {
      const recipient = accounts[0];
      const txFee = await sdk.getFee(assetId, TxType.WITHDRAW_TO_WALLET);
      accumPrivateFee += txFee;
      const withdrawProof = await sdk.createWithdrawProof(assetId, sender, withdrawValue, txFee, signer, recipient);
      withdrawTxHash = await sdk.sendProof(withdrawProof);
    }

    await Promise.all([
      sdk.awaitSettlement(depositTxHash, awaitSettlementTimeout),
      sdk.awaitSettlement(transferTxHash, awaitSettlementTimeout),
      sdk.awaitSettlement(withdrawTxHash, awaitSettlementTimeout),
    ]);

    expect(await sdk.getPublicBalance(assetId, accounts[0])).toBe(initialPublicBalance0 + withdrawValue);
    expect(await sdk.getPublicBalance(assetId, accounts[1])).toBe(initialPublicBalance1);
    expect(sdk.getBalance(assetId, userIds[0])).toBe(depositValue - transferValue - withdrawValue - accumPrivateFee);
    expect(sdk.getBalance(assetId, userIds[1])).toBe(transferValue);
  });
});
