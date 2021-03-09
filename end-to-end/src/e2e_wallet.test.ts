import { AssetId, createWalletSdk, WalletSdk, WalletSdkUser, EthAddress, WalletProvider, TxType } from '@aztec/sdk';
import { Contract } from '@ethersproject/contracts';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { getFeeDistributorContract } from './fee_distributor_contract';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

/**
 * Set the following environment variables before running falafel:
 *   TX_FEE=100000000000000000
 */

describe('end-to-end wallet tests', () => {
  let provider: WalletProvider;
  let feeDistributor: Contract;
  let sdk: WalletSdk;
  let accounts: EthAddress[] = [];
  const users: WalletSdkUser[] = [];
  const assetId = AssetId.ETH;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 3, '3');
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

    const {
      blockchainStatus: { rollupContractAddress },
    } = await sdk.getRemoteStatus();
    feeDistributor = await getFeeDistributorContract(rollupContractAddress, provider, accounts[2]);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  const getLastReimbursement = async () => {
    const eventFilter = feeDistributor.filters.FeeReimbursed();
    const events = await feeDistributor.queryFilter(eventFilter);
    const lastEvent = events[events.length - 1];
    return BigInt(lastEvent.args!.amount);
  };

  it('should deposit, transfer and withdraw funds', async () => {
    const user0Asset = users[0].getAsset(assetId);
    const txFee = await sdk.getFee(assetId, TxType.DEPOSIT);

    // Deposit to user 0.
    {
      const depositor = accounts[0];
      const depositValue = user0Asset.toBaseUnits('0.02');

      const initialTxFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));
      const initialPublicBalance = BigInt(
        await provider.request({
          method: 'eth_getBalance',
          params: [depositor.toString()],
        }),
      );
      expect(user0Asset.balance()).toBe(0n);
      const schnorrSigner = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
      const txHash = await user0Asset.deposit(depositValue, txFee, schnorrSigner, depositor);
      await sdk.awaitSettlement(txHash, 600);

      const publicBalance = await provider.request({
        method: 'eth_getBalance',
        params: [accounts[0].toString()],
      });
      const expectedPublicBalance = BigInt(initialPublicBalance) - BigInt(depositValue) - BigInt(txFee);
      // Minus gas cost for depositing funds to rollup contract.
      expect(publicBalance < expectedPublicBalance).toBe(true);

      expect(user0Asset.balance()).toBe(depositValue);

      const reimbursement = await getLastReimbursement();
      const txFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));
      expect(txFeeBalance).toEqual(BigInt(initialTxFeeBalance) + BigInt(txFee) - BigInt(reimbursement));
    }
  });
});
