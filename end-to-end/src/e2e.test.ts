import { AssetId, createEthSdk, EthereumSdk, EthereumSdkUser, TxType } from '@aztec/sdk';
import { Contract } from '@ethersproject/contracts';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { getFeeDistributorContract } from './fee_distributor_contract';

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
  let feeDistributor: Contract;
  let sdk: EthereumSdk;
  const users: EthereumSdkUser[] = [];
  const assetId = AssetId.ETH;

  beforeAll(async () => {
    const walletProvider = await createFundedWalletProvider(ETHEREUM_HOST, 3, '4');
    const accounts = walletProvider.getAccounts();

    sdk = await createEthSdk(walletProvider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    const userAddresses = accounts.slice(0, 2);
    for (const address of userAddresses) {
      const user = await sdk.addUser(address);
      users.push(user);
    }

    const {
      blockchainStatus: { rollupContractAddress },
    } = await sdk.getRemoteStatus();
    feeDistributor = await getFeeDistributorContract(rollupContractAddress, walletProvider, accounts[2]);
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
    const user1Asset = users[1].getAsset(assetId);
    const depositFee = await sdk.getFee(assetId, TxType.DEPOSIT);
    const transferFee = await sdk.getFee(assetId, TxType.TRANSFER);
    const withdrawFee = await sdk.getFee(assetId, TxType.WITHDRAW_TO_WALLET);

    // Deposit to user 0.
    {
      const depositValue = user0Asset.toBaseUnits('3');

      const initialTxFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));
      const initialPublicBalance = await user0Asset.publicBalance();
      expect(user0Asset.balance()).toBe(0n);

      const txHash = await user0Asset.deposit(depositValue, depositFee);
      await sdk.awaitSettlement(txHash, 600);

      const publicBalance = await user0Asset.publicBalance();
      const expectedPublicBalance = initialPublicBalance - depositValue - depositFee;
      // Minus gas cost for depositing funds to rollup contract.
      expect(publicBalance < expectedPublicBalance).toBe(true);

      expect(user0Asset.balance()).toBe(depositValue);

      const reimbursement = await getLastReimbursement();
      const txFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));
      expect(txFeeBalance).toEqual(initialTxFeeBalance + depositFee - reimbursement);
    }

    // Transfer to user 1.
    {
      const transferValue = user0Asset.toBaseUnits('2');

      const initialPublicBalanceUser0 = await user0Asset.publicBalance();
      const initialBalanceUser0 = user0Asset.balance();
      const initialTxFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));

      expect(user1Asset.balance()).toBe(0n);

      const txHash = await user0Asset.transfer(transferValue, transferFee, users[1].getUserData().id);
      await sdk.awaitSettlement(txHash, 600);

      expect(await user0Asset.publicBalance()).toBe(initialPublicBalanceUser0);
      expect(user0Asset.balance()).toBe(initialBalanceUser0 - transferValue - transferFee);

      expect(user1Asset.balance()).toBe(transferValue);

      const reimbursement = await getLastReimbursement();
      const txFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));
      expect(txFeeBalance).toEqual(initialTxFeeBalance + transferFee - reimbursement);
    }

    // Withdraw to user 1.
    {
      const initialPublicBalance = await user1Asset.publicBalance();
      const initialBalance = user1Asset.balance();
      const initialTxFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));

      const withdrawValue = user0Asset.toBaseUnits('1');
      const txHash = await user1Asset.withdraw(withdrawValue, withdrawFee);
      await sdk.awaitSettlement(txHash, 600);

      expect(await user1Asset.publicBalance()).toBe(initialPublicBalance + withdrawValue);
      expect(user1Asset.balance()).toBe(initialBalance - withdrawValue - withdrawFee);

      const reimbursement = await getLastReimbursement();
      const txFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));
      expect(txFeeBalance).toEqual(initialTxFeeBalance + withdrawFee - reimbursement);
    }
  });
});
