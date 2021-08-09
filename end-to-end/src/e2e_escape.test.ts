import { AssetId, createWalletSdk, EthAddress, TxType, WalletProvider, WalletSdk, WalletSdkUser } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { advanceBlocks, blocksToAdvance } from './manipulate_block';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', SRIRACHA_HOST = 'http://localhost:8082' } = process.env;

/**
 * Set the following environment variables
 * - before deploying the contracts:
 *   ESCAPE_BLOCK_LOWER=10
 *   ESCAPE_BLOCK_UPPER=100
 * - before running (if running) falafel:
 *   MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW=1
 * - before running sriracha:
 *   MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW=1
 */

describe('end-to-end escape tests', () => {
  let sdk: WalletSdk;
  let provider: WalletProvider;
  let accounts: EthAddress[] = [];
  const users: WalletSdkUser[] = [];
  const assetId = AssetId.DAI;
  const escapeBlockLowerBound = 10;
  const escapeBlockUpperBound = 100;
  const awaitSettlementTimeout = 600;

  beforeAll(async () => {
    // Init sdk.
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2);
    accounts = provider.getAccounts();

    sdk = await createWalletSdk(provider, SRIRACHA_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    // Get user addresses.
    for (const account of accounts) {
      const user = await sdk.addUser(provider.getPrivateKeyForAddress(account)!);
      users.push(user);
    }

    const nextEscapeBlock = await blocksToAdvance(escapeBlockLowerBound, escapeBlockUpperBound, provider);
    await advanceBlocks(nextEscapeBlock, provider);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const {
      blockchainStatus: { escapeOpen },
    } = await sdk.getRemoteStatus();
    expect(escapeOpen).toBe(true);

    const user0Asset = users[0].getAsset(assetId);
    const user1Asset = users[1].getAsset(assetId);

    // Deposit to user 0.
    {
      const depositor = accounts[0];
      const depositValue = user0Asset.toBaseUnits('1000');
      const fee = await user0Asset.getFee(TxType.DEPOSIT);
      const totalInput = depositValue + fee;

      await user0Asset.mint(totalInput, depositor);
      await user0Asset.approve(totalInput, depositor);

      expect(user0Asset.balance()).toBe(0n);

      await user0Asset.depositFundsToContract(depositor, totalInput);
      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
      const proofOutput = await user0Asset.createDepositProof(depositValue, fee, signer, depositor);
      const signature = await sdk.signProof(proofOutput, depositor);
      const txHash = await sdk.sendProof(proofOutput, signature);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(user0Asset.balance()).toBe(depositValue);
    }

    // Transfer to user 1.
    {
      const transferValue = user0Asset.toBaseUnits('800');
      const fee = await user0Asset.getFee(TxType.TRANSFER);

      const initialBalance0 = user0Asset.balance();
      const initialBalance1 = user1Asset.balance();

      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[0])!);
      const proofOutput = await user0Asset.createTransferProof(transferValue, fee, signer, users[1].id);
      const txHash = await sdk.sendProof(proofOutput);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(user0Asset.balance()).toBe(initialBalance0 - transferValue - fee);
      expect(user1Asset.balance()).toBe(initialBalance1 + transferValue);
    }

    // Withdraw to user 1.
    {
      const recipient = accounts[1];
      const withdrawValue = user1Asset.toBaseUnits('300');
      const fee = await user1Asset.getFee(TxType.WITHDRAW_TO_WALLET);
      const initialBalance = user1Asset.balance();

      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(recipient)!);
      const proofOutput = await user1Asset.createWithdrawProof(withdrawValue, fee, signer, recipient);
      const txHash = await sdk.sendProof(proofOutput);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(user1Asset.balance()).toBe(initialBalance - withdrawValue - fee);
      expect(await user1Asset.publicBalance(recipient)).toBe(withdrawValue);
    }
  });
});
