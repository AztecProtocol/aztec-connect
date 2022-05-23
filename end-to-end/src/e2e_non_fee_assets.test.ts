import { getTokenBalance, MainnetAddresses, TokenStore } from '@aztec/blockchain';
import {
  AccountId,
  AztecSdk,
  createAztecSdk,
  DepositController,
  EthAddress,
  toBaseUnits,
  TransferController,
  TxSettlementTime,
  WalletProvider,
  WithdrawController,
} from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { depositTokensToAztec, sendTokens, withdrawTokens } from './sdk_utils';
import createDebug from 'debug';

jest.setTimeout(5 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

/**
 * Run the following:
 * blockchain: yarn start:ganache:fork
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_non_fee_assets
 */

describe('end-to-end async defi tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let accounts: EthAddress[] = [];
  const userIds: AccountId[] = [];
  const awaitSettlementTimeout = 600;
  const ethDepositedToUsersAccount = toBaseUnits('0.2', 18);
  const ethAvailableForDefi = toBaseUnits('0.2', 15);
  const ethAssetId = 0;
  const debug = createDebug('bb:e2e_non_fee_asset');

  const debugBalance = async (assetId: number, account: number) => {
    const asset = sdk.getAssetInfo(assetId);
    debug(`account ${account} balance of ${asset.name}: ${(await sdk.getBalanceAv(assetId, userIds[account])).value}`);
  };

  const getAssetName = (assetAddress: EthAddress) => {
    return sdk.getAssetInfo(sdk.getAssetIdByAddress(assetAddress)).name;
  };

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, undefined, undefined, ethDepositedToUsersAccount);
    accounts = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    for (let i = 0; i < accounts.length; i++) {
      const user = await sdk.addUser(provider.getPrivateKeyForAddress(accounts[i])!);
      userIds.push(user.id);
    }
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should make a defi deposit', async () => {
    // Shield
    const lusdEthAddress = EthAddress.fromString(MainnetAddresses.Tokens['LUSD3CRV-F']);
    const mimEthAddress = EthAddress.fromString(MainnetAddresses.Tokens['MIM-3LP3CRV-F']);
    const lusdAssetId = sdk.getAssetIdByAddress(lusdEthAddress);
    const mimAssetId = sdk.getAssetIdByAddress(mimEthAddress);
    const user1 = userIds[0];
    const user2 = userIds[1];

    debug(`shielding ETH...`);
    const shieldValue = sdk.toBaseUnits(0, '0.08');
    let expectedUser0EthBalance = shieldValue.value;
    let expectedUser1EthBalance = shieldValue.value;
    const depositControllers: DepositController[] = [];
    for (let i = 0; i < accounts.length; i++) {
      const depositor = accounts[i];
      debug(`shielding ${sdk.fromBaseUnits(shieldValue, true)} from ${depositor.toString()}...`);
      // flush this transaction through by paying for all the slots in the rollup
      const fee = (await sdk.getDepositFees(ethAssetId))[
        i == accounts.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP
      ];
      const controller = sdk.createDepositController(depositor, shieldValue, fee, userIds[i]);
      await controller.createProof();
      await controller.sign();
      await controller.depositFundsToContract();
      await controller.awaitDepositFundsToContract();
      depositControllers.push(controller);
    }

    await Promise.all(depositControllers.map(controller => controller.send()));
    debug(`waiting for shields to settle...`);
    await Promise.all(depositControllers.map(controller => controller.awaitSettlement(awaitSettlementTimeout)));

    await debugBalance(ethAssetId, 0);
    await debugBalance(ethAssetId, 1);
    expect(await sdk.getBalance(ethAssetId, user1)).toEqual(expectedUser0EthBalance);
    expect(await sdk.getBalance(ethAssetId, user2)).toEqual(expectedUser1EthBalance);

    // user 0 purchases some lusd and MIM and deposits it into the system
    const usersEthereumAddress = accounts[0];
    const tokenStore = await TokenStore.create(provider);

    const quantityOflusdRequested = 2n * 10n ** 12n;
    const quantityOfMimRequested = 10n ** 4n;
    const lusdQuantityPurchased = await tokenStore.purchase(
      usersEthereumAddress,
      usersEthereumAddress,
      { erc20Address: lusdEthAddress, amount: quantityOflusdRequested },
      ethAvailableForDefi,
    );
    debug(
      `purchased ${lusdQuantityPurchased} of ${getAssetName(
        lusdEthAddress,
      )} for account ${usersEthereumAddress.toString()}...`,
    );
    const mimQuantityPurchased = await tokenStore.purchase(
      usersEthereumAddress,
      usersEthereumAddress,
      { erc20Address: mimEthAddress, amount: quantityOfMimRequested },
      ethAvailableForDefi,
    );
    debug(
      `purchased ${mimQuantityPurchased} of ${getAssetName(
        mimEthAddress,
      )} for account ${usersEthereumAddress.toString()}...`,
    );

    debug(`depositing ${lusdQuantityPurchased} of ${getAssetName(lusdEthAddress)} to account 0...`);

    // make the token deposits and wait for settlement
    const lusdDepositController = await depositTokensToAztec(
      usersEthereumAddress,
      user1,
      lusdEthAddress,
      lusdQuantityPurchased,
      TxSettlementTime.NEXT_ROLLUP,
      sdk,
      provider,
    );

    debug(`depositing ${mimQuantityPurchased} of ${getAssetName(mimEthAddress)} to account 0...`);
    const mimDepositController = await depositTokensToAztec(
      usersEthereumAddress,
      user1,
      mimEthAddress,
      mimQuantityPurchased,
      TxSettlementTime.INSTANT,
      sdk,
      provider,
    );
    debug('waiting for token deposits to settle...');
    const tokenDepositControllers: DepositController[] = [lusdDepositController, mimDepositController];
    await Promise.all(tokenDepositControllers.map(controller => controller.awaitSettlement(awaitSettlementTimeout)));

    expectedUser0EthBalance -= (await sdk.getDepositFees(lusdAssetId))[TxSettlementTime.NEXT_ROLLUP].value;
    expectedUser0EthBalance -= (await sdk.getDepositFees(mimAssetId))[TxSettlementTime.INSTANT].value;
    expect(await sdk.getBalance(ethAssetId, user1)).toEqual(expectedUser0EthBalance);
    expect(await sdk.getBalance(lusdAssetId, user1)).toEqual(lusdQuantityPurchased);
    expect(await sdk.getBalance(mimAssetId, user1)).toEqual(mimQuantityPurchased);

    await debugBalance(lusdAssetId, 0);
    await debugBalance(mimAssetId, 0);

    debug(`account 0 sending ${lusdQuantityPurchased} of ${getAssetName(lusdEthAddress)} to account 1...`);

    // now user 0 transfers all their lusd and MIN to user 1
    const lusdTransferController = await sendTokens(
      user1,
      user2,
      lusdEthAddress,
      lusdQuantityPurchased,
      TxSettlementTime.NEXT_ROLLUP,
      sdk,
    );

    debug(`account 0 sending ${mimQuantityPurchased} of ${getAssetName(mimEthAddress)} to account 1...`);
    const mimTransferController = await sendTokens(
      user1,
      user2,
      mimEthAddress,
      mimQuantityPurchased,
      TxSettlementTime.INSTANT,
      sdk,
    );
    debug('waiting for token transfers to settle');
    const tokenTransferControllers: TransferController[] = [lusdTransferController, mimTransferController];
    await Promise.all(tokenTransferControllers.map(controller => controller.awaitSettlement()));

    // check the new balances
    expectedUser0EthBalance -= (await sdk.getTransferFees(lusdAssetId))[TxSettlementTime.NEXT_ROLLUP].value;
    expectedUser0EthBalance -= (await sdk.getTransferFees(mimAssetId))[TxSettlementTime.INSTANT].value;
    expect(await sdk.getBalance(ethAssetId, user1)).toEqual(expectedUser0EthBalance);
    expect(await sdk.getBalance(lusdAssetId, user2)).toEqual(lusdQuantityPurchased);
    expect(await sdk.getBalance(mimAssetId, user2)).toEqual(mimQuantityPurchased);
    expect(await sdk.getBalance(lusdAssetId, user1)).toEqual(0n);
    expect(await sdk.getBalance(mimAssetId, user1)).toEqual(0n);

    await debugBalance(lusdAssetId, 0);
    await debugBalance(lusdAssetId, 1);
    await debugBalance(mimAssetId, 0);
    await debugBalance(mimAssetId, 1);

    debug(`account 1 withdrawing ${lusdQuantityPurchased} of ${getAssetName(lusdEthAddress)}...`);
    // now user 1 withdraws both assets to a wallet
    const lusdWithdrawController = await withdrawTokens(
      user2,
      accounts[1],
      lusdEthAddress,
      lusdQuantityPurchased,
      TxSettlementTime.NEXT_ROLLUP,
      sdk,
    );
    debug(`account 1 withdrawing ${mimQuantityPurchased} of ${getAssetName(mimEthAddress)}...`);
    const mimWithdrawController = await withdrawTokens(
      user2,
      accounts[1],
      mimEthAddress,
      mimQuantityPurchased,
      TxSettlementTime.INSTANT,
      sdk,
    );
    debug('waiting for withdrawals to settle...');
    const tokenWithdrawControllers: WithdrawController[] = [lusdWithdrawController, mimWithdrawController];
    await Promise.all(tokenWithdrawControllers.map(controller => controller.awaitSettlement()));

    //check the new balances
    await debugBalance(ethAssetId, 0);
    await debugBalance(lusdAssetId, 0);
    await debugBalance(mimAssetId, 0);
    await debugBalance(ethAssetId, 1);
    await debugBalance(lusdAssetId, 1);
    await debugBalance(mimAssetId, 1);
    expectedUser1EthBalance -= (await sdk.getWithdrawFees(lusdAssetId))[TxSettlementTime.NEXT_ROLLUP].value;
    expectedUser1EthBalance -= (await sdk.getWithdrawFees(mimAssetId))[TxSettlementTime.INSTANT].value;
    expect(await sdk.getBalance(ethAssetId, user2)).toEqual(expectedUser1EthBalance);
    expect(await sdk.getBalance(lusdAssetId, user2)).toEqual(0n);
    expect(await sdk.getBalance(mimAssetId, user2)).toEqual(0n);
    expect(await sdk.getBalance(lusdAssetId, user1)).toEqual(0n);
    expect(await sdk.getBalance(mimAssetId, user1)).toEqual(0n);
    expect(await getTokenBalance(lusdEthAddress, accounts[1], provider)).toEqual(lusdQuantityPurchased);
    expect(await getTokenBalance(mimEthAddress, accounts[1], provider)).toEqual(mimQuantityPurchased);
  });
});
