import { AccountId, AztecSdk, createAztecSdk, EthAddress, toBaseUnits, WalletProvider } from '@aztec/sdk';
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
  const assetId = 0;
  const awaitSettlementTimeout = 600;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(
      ETHEREUM_HOST,
      1,
      1,
      Buffer.from(PRIVATE_KEY, 'hex'),
      toBaseUnits('0.035', 18),
    );
    accounts = provider.getAccounts();

    sdk = await createAztecSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      pollInterval: 1000,
      saveProvingKey: false,
      clearDb: true,
      memoryDb: true,
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    const user = await sdk.addUser(provider.getPrivateKeyForAddress(accounts[0])!);
    userId = user.id;
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit', async () => {
    const depositValue = sdk.toBaseUnits(assetId, '0.03');

    const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[0])!);

    expect(sdk.getBalance(assetId, userId)).toBe(0n);

    const depositor = accounts[0];
    const [fee] = await sdk.getDepositFees(assetId);
    const controller = sdk.createDepositController(userId, signer, { assetId, value: depositValue }, fee, depositor);
    await controller.createProof();

    const depositTxHash = await controller.depositFundsToContract();
    await sdk.getTransactionReceipt(depositTxHash);

    await controller.sign();
    await controller.send();
    await controller.awaitSettlement(awaitSettlementTimeout);

    expect(sdk.getBalance(assetId, userId)).toBe(depositValue);
  });
});
