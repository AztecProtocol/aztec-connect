import { AssetId, createEthSdk, EthereumSdk, EthereumSdkUser } from 'aztec2-sdk';
import { Contract } from '@ethersproject/contracts';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { getFeeDistributorContract } from './fee_distributor_contract';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end tests', () => {
  let feeDistributor: Contract;
  let sdk: EthereumSdk;
  const users: EthereumSdkUser[] = [];
  const assetId = AssetId.ETH;
  const oneEth = BigInt(10) ** BigInt(18);

  beforeAll(async () => {
    const walletProvider = await createFundedWalletProvider(ETHEREUM_HOST, 3, '10');
    const accounts = walletProvider.getAccounts();

    sdk = await createEthSdk(walletProvider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    const userAddresses = accounts.slice(0, 2);
    for (const address of userAddresses) {
      const user = await sdk.addUser(address);
      users.push(user);
    }

    const { rollupContractAddress } = await sdk.getRemoteStatus();
    feeDistributor = await getFeeDistributorContract(rollupContractAddress, walletProvider, accounts[2]);
    await feeDistributor.deposit(assetId, oneEth, { value: oneEth });
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
    const txFee = oneEth / BigInt(10);

    const initialTxFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));

    // Deposit to user 0.
    {
      const depositValue = oneEth * BigInt(8);
      const initialPublicBalance = await user0Asset.publicBalance();
      expect(user0Asset.balance()).toBe(0n);

      const txHash = await user0Asset.deposit(depositValue, undefined, undefined, { txFee });
      await sdk.awaitSettlement(txHash, 600);

      const publicBalance = await user0Asset.publicBalance();
      const expectedPublicBalance = initialPublicBalance - depositValue - txFee;
      expect(publicBalance < expectedPublicBalance).toBe(true); // Minus gas cost for depositing funds to rollup contract.

      expect(user0Asset.balance()).toBe(depositValue);

      const reimbursement = await getLastReimbursement();
      const txFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));
      expect(txFeeBalance).toEqual(initialTxFeeBalance + txFee - reimbursement);
    }

    // Transfer to user 1.
    {
      const transferValue = oneEth * BigInt(5);

      const initialPublicBalanceUser0 = await user0Asset.publicBalance();
      const initialBalanceUser0 = user0Asset.balance();
      const initialTxFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));

      expect(user1Asset.balance()).toBe(0n);

      const transferTxHash = await user0Asset.transfer(transferValue, users[1].getUserData().id, undefined, {
        txFee,
        payTxFeeByPrivateAsset: true,
      });
      await sdk.awaitSettlement(transferTxHash, 600);

      expect(await user0Asset.publicBalance()).toBe(initialPublicBalanceUser0);
      expect(user0Asset.balance()).toBe(initialBalanceUser0 - transferValue - txFee);

      expect(user1Asset.balance()).toBe(transferValue);

      const reimbursement = await getLastReimbursement();
      const txFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));
      expect(txFeeBalance).toEqual(initialTxFeeBalance + txFee - reimbursement);
    }

    // Withdraw to user 1.
    {
      const initialPublicBalance = await user1Asset.publicBalance();
      const initialBalance = user1Asset.balance();
      const initialTxFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));

      const withdrawValue = oneEth * BigInt(3);
      const withdrawTxHash = await user1Asset.withdraw(withdrawValue, undefined, undefined, {
        txFee,
        payTxFeeByPrivateAsset: true,
      });
      await sdk.awaitSettlement(withdrawTxHash, 600);

      expect(await user1Asset.publicBalance()).toBe(initialPublicBalance + withdrawValue);
      expect(user1Asset.balance()).toBe(initialBalance - withdrawValue - txFee);

      const reimbursement = await getLastReimbursement();
      const txFeeBalance = BigInt(await feeDistributor.txFeeBalance(assetId));
      expect(txFeeBalance).toEqual(initialTxFeeBalance + txFee - reimbursement);
    }
  });
});
