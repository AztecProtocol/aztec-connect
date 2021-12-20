import { AssetId, createWalletSdk, EthAddress, SdkOptions, TxType, WalletProvider } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { advanceBlocks, blocksToAdvance } from './manipulate_block';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  SRIRACHA_HOST = 'http://localhost:8082',
  ROLLUP_HOST = 'http://localhost:8081',
} = process.env;

/**
 * Run the following:
 * - blockchain: yarn start:ganache
 * - halloumi: yarn start:dev
 * - falafel: yarn start:e2e
 * - end-to-end: yarn test ./src/e2e_mixed.test.ts
 */

describe('end-to-end mixed tests', () => {
  let provider: WalletProvider;
  let accounts: EthAddress[] = [];
  const escapeBlockLowerBound = 10;
  const escapeBlockUpperBound = 100;
  const awaitSettlementTimeout = 600;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2);
    accounts = provider.getAccounts();
  });

  it('should succesfully mix normal and escape mode transactions', async () => {
    const sdkOptions: SdkOptions = {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      memoryDb: true,
      minConfirmation: 1,
      minConfirmationEHW: 1,
    };

    // Run a normal sdk and deposit to user 0.
    {
      const sdk = await createWalletSdk(provider, ROLLUP_HOST, sdkOptions);
      await sdk.init();

      const depositor = accounts[0];
      const privateKey = provider.getPrivateKeyForAddress(depositor)!;
      const user = await sdk.addUser(privateKey);
      await user.awaitSynchronised();

      const assetId = AssetId.DAI;
      const userAsset = user.getAsset(assetId);
      const depositValue = 1000n;
      const txFee = await userAsset.getFee(TxType.DEPOSIT);

      await userAsset.mint(depositValue + txFee, depositor);
      await userAsset.approve(depositValue + txFee, depositor);
      await userAsset.depositFundsToContract(depositor, depositValue + txFee);
      const signer = sdk.createSchnorrSigner(privateKey);
      const proofOutput = await userAsset.createDepositProof(depositValue, txFee, signer, depositor);
      const signature = await sdk.signProof(proofOutput, depositor);
      const txHash = await sdk.sendProof(proofOutput, signature);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(userAsset.balance()).toBe(depositValue);

      await sdk.destroy();
    }

    // Run an escape sdk and deposit to user 1.
    {
      const nextEscapeBlock = await blocksToAdvance(escapeBlockLowerBound, escapeBlockUpperBound, provider);
      await advanceBlocks(nextEscapeBlock, provider);

      const sdk = await createWalletSdk(provider, SRIRACHA_HOST, sdkOptions);
      await sdk.init();
      await sdk.awaitSynchronised();

      const depositor = accounts[1];
      const privateKey = provider.getPrivateKeyForAddress(depositor)!;
      const user = await sdk.addUser(privateKey);
      await user.awaitSynchronised();

      const assetId = AssetId.ETH;
      const userAsset = user.getAsset(assetId);
      const depositValue = userAsset.toBaseUnits('0.1');
      const txFee = await userAsset.getFee(TxType.DEPOSIT);

      await userAsset.depositFundsToContract(depositor, depositValue + txFee);
      const signer = sdk.createSchnorrSigner(privateKey);
      const proofOutput = await userAsset.createDepositProof(depositValue, txFee, signer, depositor);
      const signature = await sdk.signProof(proofOutput, depositor);
      const txHash = await sdk.sendProof(proofOutput, signature);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(userAsset.balance()).toBe(depositValue);

      await sdk.destroy();
    }

    {
      // Run a normal sdk and withdraw half to user 0.
      const sdk = await createWalletSdk(provider, ROLLUP_HOST, sdkOptions);
      await sdk.init();
      await sdk.awaitSynchronised();

      const userAddress = accounts[0];
      const privateKey = provider.getPrivateKeyForAddress(userAddress)!;
      const user = await sdk.addUser(privateKey);
      await user.awaitSynchronised();

      const assetId = AssetId.DAI;
      const userAsset = user.getAsset(assetId);
      const withdrawValue = 500n;
      const txFee = await userAsset.getFee(TxType.WITHDRAW_TO_WALLET);

      const initialPublicBalance = await userAsset.publicBalance(userAddress);
      const initialBalance = userAsset.balance();

      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(userAddress)!);
      const proofOutput = await userAsset.createWithdrawProof(withdrawValue, txFee, signer, userAddress);
      const txHash = await sdk.sendProof(proofOutput);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(await userAsset.publicBalance(userAddress)).toBe(initialPublicBalance + withdrawValue);
      expect(userAsset.balance()).toBe(initialBalance - withdrawValue - txFee);

      await sdk.destroy();
    }
  });
});
