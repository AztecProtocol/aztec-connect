import { AztecSdk, createAztecSdk, EthAddress, TxId, TxSettlementTime, WalletProvider } from '@aztec/sdk';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
  PROVERLESS,
} = process.env;

/**
 * Run the following:
 * blockchain: yarn start:ganache
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test ./src/e2e.test.ts
 */

describe('end-to-end tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let addresses: EthAddress[] = [];
  const assetId = 0;
  const awaitSettlementTimeout = 600;

  const createUser = async (accountPrivateKey = randomBytes(32), nonce = 0) => {
    const userId = (await sdk.addUser(accountPrivateKey, nonce)).id;
    const signingPrivateKey = !nonce ? accountPrivateKey : randomBytes(32);
    const signer = sdk.createSchnorrSigner(signingPrivateKey);
    return { userId, signer, accountPrivateKey };
  };

  beforeAll(async () => {
    const initialBalance = 2n * 10n ** 16n; // 0.02
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 3, 2, Buffer.from(PRIVATE_KEY, 'hex'), initialBalance);
    addresses = provider.getAccounts();

    sdk = await createAztecSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      proverless: PROVERLESS === 'true',
      pollInterval: 1000,
      saveProvingKey: false,
      clearDb: true,
      memoryDb: true,
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.init();
    await sdk.awaitSynchronised();
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const depositValue = sdk.toBaseUnits(assetId, '0.015');
    const transferValue = sdk.toBaseUnits(assetId, '0.007');
    const withdrawValueA = sdk.toBaseUnits(assetId, '0.008');
    const withdrawValueB = sdk.toBaseUnits(assetId, '0.003');

    const { userId: userA, signer: signerA } = await createUser();
    const { userId: userB, signer: signerB } = await createUser();

    let initialPublicBalance0: bigint;
    let initialPublicBalance1: bigint;
    expect(sdk.getBalance(assetId, userA)).toBe(0n);
    expect(sdk.getBalance(assetId, userB)).toBe(0n);

    const depositTxIds: TxId[] = [];

    // UserA deposits from Address0.
    {
      const depositor = addresses[0];
      const [fee] = await sdk.getDepositFees(assetId);
      const controller = sdk.createDepositController(userA, signerA, { assetId, value: depositValue }, fee, depositor);
      await controller.createProof();

      const txHash = await controller.depositFundsToContract();
      await sdk.getTransactionReceipt(txHash);
      initialPublicBalance0 = await sdk.getPublicBalance(assetId, depositor);

      await controller.sign();
      depositTxIds.push(await controller.send());
    }

    // UserB deposits from Address1.
    {
      const depositor = addresses[1];
      const fee = (await sdk.getDepositFees(assetId))[TxSettlementTime.INSTANT];
      const controller = sdk.createDepositController(userB, signerB, { assetId, value: depositValue }, fee, depositor);
      await controller.createProof();
      await controller.sign();

      const txHash = await controller.depositFundsToContract();
      await sdk.getTransactionReceipt(txHash);
      initialPublicBalance1 = await sdk.getPublicBalance(assetId, depositor);

      depositTxIds.push(await controller.send());
    }

    await Promise.all(depositTxIds.map(txId => sdk.awaitSettlement(txId, awaitSettlementTimeout)));

    expect(await sdk.getPublicBalance(assetId, addresses[0])).toBe(initialPublicBalance0);
    expect(await sdk.getPublicBalance(assetId, addresses[1])).toBe(initialPublicBalance1);
    expect(await sdk.getPublicBalance(assetId, addresses[2])).toBe(0n);
    expect(sdk.getBalance(assetId, userA)).toBe(depositValue);
    expect(sdk.getBalance(assetId, userB)).toBe(depositValue);

    const txIds: TxId[] = [];

    // UserA withdraws to Address2.
    const [withdrawFee] = await sdk.getWithdrawFees(assetId);
    {
      const recipient = addresses[2];
      const controller = sdk.createWithdrawController(
        userA,
        signerA,
        { assetId, value: withdrawValueA },
        withdrawFee,
        recipient,
      );
      await controller.createProof();
      txIds.push(await controller.send());
    }

    // UserB withdraws to Address2.
    {
      const recipient = addresses[2];
      const controller = sdk.createWithdrawController(
        userB,
        signerB,
        { assetId, value: withdrawValueB },
        withdrawFee,
        recipient,
      );
      await controller.createProof();
      txIds.push(await controller.send());
    }

    // UserB transfers to userA.
    const transferFee = (await sdk.getTransferFees(assetId))[TxSettlementTime.INSTANT];
    {
      const controller = sdk.createTransferController(
        userB,
        signerB,
        { assetId, value: transferValue },
        transferFee,
        userA,
      );
      await controller.createProof();
      txIds.push(await controller.send());
    }

    await Promise.all(txIds.map(txId => sdk.awaitSettlement(txId, awaitSettlementTimeout)));

    expect(await sdk.getPublicBalance(assetId, addresses[0])).toBe(initialPublicBalance0);
    expect(await sdk.getPublicBalance(assetId, addresses[1])).toBe(initialPublicBalance1);
    expect(await sdk.getPublicBalance(assetId, addresses[2])).toBe(withdrawValueA + withdrawValueB);
    expect(sdk.getBalance(assetId, userA)).toBe(depositValue - withdrawValueA - withdrawFee.value + transferValue);
    expect(sdk.getBalance(assetId, userB)).toBe(
      depositValue - withdrawValueB - withdrawFee.value - transferValue - transferFee.value,
    );
  });
});
