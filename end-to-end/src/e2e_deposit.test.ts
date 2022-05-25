import {
  AccountId,
  AztecSdk,
  createAztecSdk,
  EthAddress,
  toBaseUnits,
  TxSettlementTime,
  WalletProvider,
} from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
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
  let sdk: AztecSdk;
  let accounts: EthAddress[] = [];
  let userId!: AccountId;
  const awaitSettlementTimeout = 600;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(
      ETHEREUM_HOST,
      2,
      2,
      Buffer.from(PRIVATE_KEY, 'hex'),
      toBaseUnits('0.035', 18),
    );
    accounts = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    const user = await sdk.addUser(provider.getPrivateKeyForAddress(accounts[0])!);
    userId = user.id;
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit', async () => {
    const assetId = 0;
    const depositValue = sdk.toBaseUnits(assetId, '0.03');

    expect(await sdk.getBalance(assetId, userId)).toBe(0n);

    const depositor = accounts[0];
    const fee = (await sdk.getDepositFees(assetId))[TxSettlementTime.INSTANT];
    const controller = sdk.createDepositController(depositor, depositValue, fee, userId);
    await controller.createProof();

    await controller.depositFundsToContract();
    await controller.awaitDepositFundsToContract();

    await controller.sign();
    await controller.send();
    await controller.awaitSettlement(awaitSettlementTimeout);

    expect(await sdk.getBalanceAv(assetId, userId)).toEqual(depositValue);
  });

  it('should deposit with non standard permit', async () => {
    const assetId = 1;
    const initialBalance = sdk.toBaseUnits(assetId, '100');
    const depositor = accounts[1];

    await sdk.mint(assetId, initialBalance.value, depositor);

    const depositValue = sdk.toBaseUnits(assetId, '60');

    expect(await sdk.getBalance(assetId, userId)).toBe(0n);

    const fee = (await sdk.getDepositFees(assetId))[TxSettlementTime.INSTANT];
    const controller = sdk.createDepositController(depositor, depositValue, fee, userId);
    await controller.createProof();

    await controller.depositFundsToContractWithNonStandardPermit();
    await controller.awaitDepositFundsToContract();

    await controller.sign();
    await controller.send();
    await controller.awaitSettlement(awaitSettlementTimeout);

    expect(await sdk.getBalanceAv(assetId, userId)).toEqual(depositValue);
  });
});
