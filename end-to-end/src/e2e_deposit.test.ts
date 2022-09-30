import {
  AztecSdk,
  createAztecSdk,
  EthAddress,
  GrumpkinAddress,
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
 * This simple deposit is run with the prover enabled in the e2e-prover test in CI.
 *
 * Run the following:
 * blockchain: yarn start:ganache
 * kebab: yarn start:e2e
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test ./src/e2e_deposit.test.ts
 */

describe('end-to-end deposit test', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let depositor: EthAddress;
  let userId!: GrumpkinAddress;
  const awaitSettlementTimeout = 600;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(
      ETHEREUM_HOST,
      1,
      1,
      Buffer.from(PRIVATE_KEY, 'hex'),
      toBaseUnits('0.035', 18),
    );
    [depositor] = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    const accountKey = await sdk.generateAccountKeyPair(depositor);
    const user = await sdk.addUser(accountKey.privateKey);
    userId = user.id;
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit', async () => {
    const assetId = 0;
    const depositValue = sdk.toBaseUnits(assetId, '0.03');

    expect((await sdk.getBalance(userId, assetId)).value).toBe(0n);

    const fee = (await sdk.getDepositFees(assetId))[TxSettlementTime.INSTANT];
    const controller = sdk.createDepositController(depositor, depositValue, fee, userId);
    await controller.createProof();

    await controller.depositFundsToContract();
    await controller.awaitDepositFundsToContract();

    await controller.sign();
    await controller.send();
    await controller.awaitSettlement(awaitSettlementTimeout);

    expect(await sdk.getBalance(userId, assetId)).toEqual(depositValue);
  });
});
