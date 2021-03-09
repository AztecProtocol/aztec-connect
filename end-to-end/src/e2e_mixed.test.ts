import { AssetId, createEthSdk, EthAddress, WalletProvider, TxType, SdkOptions } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { advanceBlocks, blocksToAdvance } from './manipulate_block';
import { topUpFeeDistributorContract } from './fee_distributor_contract';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

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
 * - falafel: yarn start:e2e
 */

describe('end-to-end falafel recovery tests', () => {
  let provider: WalletProvider;
  let userAddress: EthAddress;
  let feeContributor: EthAddress;
  const assetId = AssetId.DAI;
  const escapeBlockLowerBound = 10;
  const escapeBlockUpperBound = 100;
  const awaitSettlementTimeout = 300;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, '10');
    [userAddress, feeContributor] = provider.getAccounts();
  });

  it('should succesfully mix normal and escape mode transactions', async () => {
    const sdkOptions: SdkOptions = {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
      minConfirmation: 1,
      minConfirmationEHW: 1,
    };

    // Run a normal sdk and deposit.
    {
      const sdk = await createEthSdk(provider, ROLLUP_HOST, sdkOptions);
      await sdk.init();

      const {
        blockchainStatus: { rollupContractAddress },
      } = await sdk.getRemoteStatus();
      const oneEth = BigInt(10) ** BigInt(18);
      await topUpFeeDistributorContract(oneEth, rollupContractAddress, provider, feeContributor);

      const user = await sdk.addUser(userAddress);
      await user.awaitSynchronised();

      const userAsset = user.getAsset(assetId);
      const txFee = await userAsset.getFee(TxType.DEPOSIT);
      const depositValue = 1000n;

      await userAsset.mint(depositValue + txFee);
      await userAsset.approve(depositValue + txFee);

      const txHash = await userAsset.deposit(depositValue, txFee);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(userAsset.balance()).toBe(depositValue);

      await sdk.destroy();
    }

    // Run an escape sdk and withdraw half.
    {
      const nextEscapeBlock = await blocksToAdvance(escapeBlockLowerBound, escapeBlockUpperBound, provider);
      await advanceBlocks(nextEscapeBlock, provider);

      const sdk = await createEthSdk(provider, SRIRACHA_HOST, sdkOptions);
      await sdk.init();
      await sdk.awaitSynchronised();

      const user = await sdk.addUser(userAddress);
      await user.awaitSynchronised();

      const userAsset = user.getAsset(assetId);

      const txHash = await userAsset.withdraw(500n, 0n);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(await userAsset.publicBalance()).toBe(500n);
      expect(userAsset.balance()).toBe(500n);

      await sdk.destroy();
    }

    {
      // Run a normal sdk and withdraw half.
      const sdk = await createEthSdk(provider, ROLLUP_HOST, sdkOptions);
      await sdk.init();
      await sdk.awaitSynchronised();

      const user = await sdk.addUser(userAddress);
      await user.awaitSynchronised();

      const userAsset = user.getAsset(assetId);
      const txFee = await userAsset.getFee(TxType.WITHDRAW_TO_WALLET);
      const withdrawValue = 500n - txFee;

      const txHash = await userAsset.withdraw(withdrawValue, txFee);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(await userAsset.publicBalance()).toBe(500n + withdrawValue);
      expect(userAsset.balance()).toBe(0n);

      await sdk.destroy();
    }
  });
});
