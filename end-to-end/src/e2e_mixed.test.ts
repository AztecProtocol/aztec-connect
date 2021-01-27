import { AssetId, createEthSdk, EthAddress, WalletProvider } from '@aztec/sdk';
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
 * Set the following environment variables
 * - before deploying the contracts:
 *   ESCAPE_BLOCK_LOWER=10
 *   ESCAPE_BLOCK_UPPER=100
 * - before running sriracha:
 *   MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW=1
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
    // Run a normal sdk and deposit.
    {
      const sdk = await createEthSdk(provider, ROLLUP_HOST, {
        syncInstances: false,
        saveProvingKey: false,
        clearDb: true,
        dbPath: ':memory:',
      });
      await sdk.init();

      const { rollupContractAddress } = await sdk.getRemoteStatus();
      const oneEth = BigInt(10) ** BigInt(18);
      await topUpFeeDistributorContract(oneEth, rollupContractAddress, provider, feeContributor);

      const user = await sdk.addUser(userAddress);
      await sdk.awaitSynchronised();

      const userAsset = user.getAsset(assetId);
      const txFee = await userAsset.getFee();
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

      const sdk = await createEthSdk(provider, SRIRACHA_HOST, {
        syncInstances: false,
        saveProvingKey: false,
        clearDb: true,
        dbPath: ':memory:',
      });
      await sdk.init();
      const user = await sdk.addUser(userAddress);
      await sdk.awaitSynchronised();

      const userAsset = user.getAsset(assetId);

      const txHash = await userAsset.withdraw(500n, 0n);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(await userAsset.publicBalance()).toBe(500n);
      expect(userAsset.balance()).toBe(500n);

      await sdk.destroy();
    }

    {
      // Run a normal sdk and withdraw half.
      const sdk = await createEthSdk(provider, ROLLUP_HOST, {
        syncInstances: false,
        saveProvingKey: false,
        clearDb: true,
        dbPath: ':memory:',
      });
      await sdk.init();
      const user = await sdk.addUser(userAddress);
      await sdk.awaitSynchronised();

      const userAsset = user.getAsset(assetId);
      const txFee = await userAsset.getFee();
      const withdrawValue = 500n - txFee;

      const txHash = await userAsset.withdraw(withdrawValue, txFee);
      await sdk.awaitSettlement(txHash, awaitSettlementTimeout);

      expect(await userAsset.publicBalance()).toBe(500n + withdrawValue);
      expect(userAsset.balance()).toBe(0n);

      await sdk.destroy();
    }
  });
});
