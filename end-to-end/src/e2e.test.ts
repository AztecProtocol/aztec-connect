import { AssetId, createWalletSdk, EthAddress, TxHash, TxSettlementTime, WalletProvider, WalletSdk } from '@aztec/sdk';
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
  let sdk: WalletSdk;
  let addresses: EthAddress[] = [];
  const assetId = AssetId.ETH;
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

    sdk = await createWalletSdk(provider, ROLLUP_HOST, {
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
    const depositValue = sdk.toBaseUnits(assetId, '0.01');
    const transferValue = sdk.toBaseUnits(assetId, '0.007');
    const withdrawValue = sdk.toBaseUnits(assetId, '0.008');

    const { userId: userA, signer: signerA } = await createUser();
    const { userId: userB, signer: signerB } = await createUser();

    let initialPublicBalance0: bigint;
    let initialPublicBalance1: bigint;
    expect(sdk.getBalance(assetId, userA)).toBe(0n);
    expect(sdk.getBalance(assetId, userB)).toBe(0n);

    const txHashes: TxHash[] = [];

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
      txHashes.push(await controller.send());
    }

    // UserB deposits from Address1.
    {
      const depositor = addresses[1];
      const [fee] = await sdk.getDepositFees(assetId);
      const controller = sdk.createDepositController(userB, signerB, { assetId, value: depositValue }, fee, depositor);
      await controller.createProof();
      await controller.sign();

      const txHash = await controller.depositFundsToContract();
      await sdk.getTransactionReceipt(txHash);
      initialPublicBalance1 = await sdk.getPublicBalance(assetId, depositor);

      txHashes.push(await controller.send());
    }

    // UserB transfers to userA.
    const [transferFee] = await sdk.getTransferFees(assetId);
    {
      const controller = sdk.createTransferController(
        userB,
        signerB,
        { assetId, value: transferValue },
        transferFee,
        userA,
      );
      await controller.createProof();
      txHashes.push(await controller.send());
    }

    // UserA withdraws to Address2.
    const withdrawFee = (await sdk.getWithdrawFees(assetId))[TxSettlementTime.INSTANT];
    {
      const recipient = addresses[2];
      const controller = sdk.createWithdrawController(
        userA,
        signerA,
        { assetId, value: withdrawValue },
        withdrawFee,
        recipient,
      );
      await controller.createProof();
      txHashes.push(await controller.send());
    }

    await Promise.all(txHashes.map(txHash => sdk.awaitSettlement(txHash, awaitSettlementTimeout)));

    expect(await sdk.getPublicBalance(assetId, addresses[0])).toBe(initialPublicBalance0);
    expect(await sdk.getPublicBalance(assetId, addresses[1])).toBe(initialPublicBalance1);
    expect(await sdk.getPublicBalance(assetId, addresses[2])).toBe(withdrawValue);
    expect(sdk.getBalance(assetId, userA)).toBe(depositValue + transferValue - withdrawValue - withdrawFee.value);
    expect(sdk.getBalance(assetId, userB)).toBe(depositValue - transferValue - transferFee.value);
  });
});
