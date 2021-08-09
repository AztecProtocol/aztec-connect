import {
  AccountId,
  AssetId,
  createWalletSdk,
  EthAddress,
  TxType,
  WalletProvider,
  WalletSdk,
  FeeDistributor,
} from '@aztec/sdk';
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
 * end-to-end: yarn test ./src/e2e.test.ts
 */

describe('end-to-end tests', () => {
  let provider: WalletProvider;
  let feeDistributor: FeeDistributor;
  let sdk: WalletSdk;
  let accounts: EthAddress[] = [];
  let assetAddr: EthAddress;
  const userIds: AccountId[] = [];
  const assetId = AssetId.ETH;
  const awaitSettlementTimeout = 600;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2);
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

    const {
      blockchainStatus: { feeDistributorContractAddress, assets },
    } = await sdk.getRemoteStatus();
    assetAddr = assets[0].address;
    feeDistributor = new FeeDistributor(feeDistributorContractAddress, provider);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    // Deposit to user 0.
    {
      const userId = userIds[0];
      const depositor = accounts[0];
      const value = sdk.toBaseUnits(assetId, '0.2');
      const txFee = await sdk.getFee(assetId, TxType.DEPOSIT);

      const initialTxFeeBalance = await feeDistributor.txFeeBalance(assetAddr);
      const initialPublicBalance = await sdk.getPublicBalance(assetId, depositor);
      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
      const proofOutput = await sdk.createDepositProof(assetId, depositor, userId, value, txFee, signer);
      const signature = await sdk.signProof(proofOutput, depositor);

      await expect(sdk.sendProof(proofOutput, signature)).rejects.toThrow();

      await sdk.depositFundsToContract(assetId, depositor, value + txFee);

      const publicBalance = await sdk.getPublicBalance(assetId, depositor);
      const expectedPublicBalance = initialPublicBalance - value - txFee;
      // Minus gas cost for depositing funds to rollup contract.
      expect(publicBalance < expectedPublicBalance).toBe(true);
      expect(sdk.getBalance(assetId, userId)).toBe(BigInt(0));

      const txHash = await sdk.sendProof(proofOutput, signature);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(await sdk.getPublicBalance(assetId, depositor)).toBe(publicBalance);
      expect(sdk.getBalance(assetId, userId)).toBe(value);

      const reimbursement = await feeDistributor.getLastReimbursement();
      const txFeeBalance = await feeDistributor.txFeeBalance(assetAddr);
      expect(txFeeBalance).toEqual(initialTxFeeBalance + txFee - reimbursement);
    }

    // Transfer to user 1.
    {
      const sender = userIds[0];
      const senderAddress = accounts[0];
      const recipient = userIds[1];
      const value = sdk.toBaseUnits(assetId, '0.15');
      const txFee = await sdk.getFee(assetId, TxType.TRANSFER);

      const initialSenderPublicBalance = await sdk.getPublicBalance(assetId, senderAddress);
      const initialSenderBalance = sdk.getBalance(assetId, sender);
      const initialTxFeeBalance = await feeDistributor.txFeeBalance(assetAddr);

      expect(sdk.getBalance(assetId, recipient)).toBe(0n);

      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(senderAddress)!);
      const proofOutput = await sdk.createTransferProof(assetId, sender, value, txFee, signer, recipient);
      const txHash = await sdk.sendProof(proofOutput);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(await sdk.getPublicBalance(assetId, senderAddress)).toBe(initialSenderPublicBalance);
      expect(sdk.getBalance(assetId, sender)).toBe(initialSenderBalance - value - txFee);
      expect(sdk.getBalance(assetId, recipient)).toBe(value);

      const reimbursement = await feeDistributor.getLastReimbursement();
      const txFeeBalance = await feeDistributor.txFeeBalance(assetAddr);
      expect(txFeeBalance).toEqual(initialTxFeeBalance + txFee - reimbursement);
    }

    // Withdraw to user 1.
    {
      const userId = userIds[1];
      const userAddress = accounts[1];
      const value = sdk.toBaseUnits(assetId, '0.08');
      const txFee = await sdk.getFee(assetId, TxType.WITHDRAW_TO_WALLET);

      const initialPublicBalance = await sdk.getPublicBalance(assetId, userAddress);
      const initialBalance = sdk.getBalance(assetId, userId);
      const initialTxFeeBalance = await feeDistributor.txFeeBalance(assetAddr);

      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(userAddress)!);
      const proofOutput = await sdk.createWithdrawProof(assetId, userId, value, txFee, signer, userAddress);
      const txHash = await sdk.sendProof(proofOutput);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(await sdk.getPublicBalance(assetId, userAddress)).toBe(initialPublicBalance + value);
      expect(sdk.getBalance(assetId, userId)).toBe(initialBalance - value - txFee);

      const reimbursement = await feeDistributor.getLastReimbursement();
      const txFeeBalance = await feeDistributor.txFeeBalance(assetAddr);
      expect(txFeeBalance).toEqual(initialTxFeeBalance + txFee - reimbursement);
    }
  });
});
