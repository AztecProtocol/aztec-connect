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
import { createFundedWalletProvider } from './create_funded_wallet_provider.js';
import { jest } from '@jest/globals';
import { TokenAsset } from '@aztec/blockchain';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
  ROLLUP_CONTRACT_ADDRESS = '',
  DAI_CONTRACT_ADDRESS = '',
} = process.env;

/**
 * Run the following:
 * contracts: ./scripts/start_e2e.sh
 * kebab: yarn start:e2e
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_deposit_permit.test.ts
 */

describe('end-to-end deposit erc20 tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let depositor: EthAddress;
  let userId!: GrumpkinAddress;
  let rollupAddress: EthAddress;
  let daiAddress: EthAddress;
  let dai: TokenAsset;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(
      ETHEREUM_HOST,
      1,
      1,
      Buffer.from(PRIVATE_KEY, 'hex'),
      toBaseUnits('0.01', 18),
    );
    [depositor] = provider.getAccounts();

    // Setup DAI
    rollupAddress = EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS);
    daiAddress = EthAddress.fromString(DAI_CONTRACT_ADDRESS);
    dai = await TokenAsset.fromAddress(daiAddress, provider, 100000);

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

  it('Should deposit ERC20s separate approval flow', async () => {
    // Asset id 1 = DAI
    const assetId = 1;
    const initialBalance = sdk.toBaseUnits(assetId, '100');

    await sdk.mint(initialBalance, depositor);
    await dai.approve(initialBalance.value, depositor, rollupAddress);

    const depositValue = sdk.toBaseUnits(assetId, '60');

    expect((await sdk.getBalance(userId, assetId)).value).toBe(0n);

    const fee = (await sdk.getDepositFees(assetId))[TxSettlementTime.INSTANT];
    const controller = sdk.createDepositController(depositor, depositValue, fee, userId);
    await controller.createProof();

    await controller.depositFundsToContractWithNonStandardPermit();
    await controller.awaitDepositFundsToContract();

    await controller.sign();
    await controller.send();
    await controller.awaitSettlement();

    expect(await sdk.getBalance(userId, assetId)).toEqual(depositValue);
  });
});
