import { setMockBridgeSubsidy } from '@aztec/blockchain';
import {
  AssetValue,
  AztecSdk,
  BridgeCallData,
  createAztecSdk,
  DefiSettlementTime,
  EthAddress,
  GrumpkinAddress,
  SchnorrSigner,
  toBaseUnits,
  WalletProvider,
} from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider.js';
import { addUsers } from './sdk_utils.js';
import { jest } from '@jest/globals';
import debug from 'debug';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  PRIVATE_KEY = '',
} = process.env;

const sleep = async (ms: number) => {
  await new Promise(resolve => setTimeout(resolve, ms));
};

const raiseBridgeSubsidy = async (
  sdk: AztecSdk,
  provider: WalletProvider,
  bridgeAddressIds: number[],
  currentSubsidy: number,
  desiredSubsidy: number,
) => {
  const increment = 75000;
  while (currentSubsidy < desiredSubsidy) {
    currentSubsidy += increment;
    for (const id of bridgeAddressIds) {
      await setBridgeSubsidy(sdk, provider, id, currentSubsidy);
    }
    await sleep(10000);
  }
};

const setBridgeSubsidy = async (
  sdk: AztecSdk,
  provider: WalletProvider,
  bridgeAddressId: number,
  currentSubsidy: number,
) => {
  const status = await sdk.getRemoteStatus();
  const dataProviderAddress = status.blockchainStatus.bridgeDataProvider;
  debug(`setting subsidy for bridge ${bridgeAddressId} to ${currentSubsidy}`);
  await setMockBridgeSubsidy(provider, dataProviderAddress, bridgeAddressId, currentSubsidy);
};

const bridgeAddressId = 3;
const ethAssetId = 0;
const tokenAAssetId = 1;

/**
 * Test Rationale - e2e subsidy test.
 * Bridges have a subsidy function that allows any user to add a subsidise the fees.
 * The purpose of this to make up the difference when a bridge does not have enough users to make it profitable to
 * execute.
 *
 * In this test we first send a transaction for a user that pays the minimum fee (DEADLINE),
 * then we flush the deadline and assert that the transaction was NOT included. This is expected
 * as it is not profitable for the sequencers to include the defi interaction in the rollup with
 * just the users fee and no subsidy
 *
 * Next we add a subsidy to the bridge. Then flush the rollup again. This time we expect the user's transaction to
 * have been included. - The state will move from PENDING -> AWAITING_FINALISATION.
 *
 * As this is an asynchronous interaction, we will then get the interaction nonce and call processAsyncDefiInteraction.
 * This will complete the interaction.
 *
 * Upon flushing the rollup again, as the async interaction has been processed the state will move from
 * AWAITING_FINALIZATION -> AWAITING_SETTLEMENT.
 *
 * Finally, we flush another rollup and expect the state of the transaction to move to SETTLED. Now that settlement
 * has occurred the user will have the output notes of the interaction.
 *
 * Steps:
 *  1. Fund accounts with Eth and add users to the rollup.
 *  2. Send interaction
 *  3. Flush rollup (tx not included)
 *  4. Add subsidy
 *  5. Flush rollup (tx now included)
 *  6. Flush rollup (tx now settled)
 *
 * Run the following:
 * contracts: ./scripts/start_e2e.sh
 * kebab: yarn start:e2e
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_subsidy_async.test.ts
 */
describe('end-to-end subsidy async test', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let accounts: EthAddress[] = [];
  let userIds: GrumpkinAddress[] = [];
  let shieldValue: AssetValue;
  let signers: SchnorrSigner[] = [];
  const debug = createDebug('bb:e2e_subsidy');

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex');
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, 2, privateKey, toBaseUnits('0.4', 18));
    accounts = provider.getAccounts();

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();

    debug(`adding users...`);
    shieldValue = sdk.toBaseUnits(0, '0.10');
    ({ userIds, signers } = await addUsers(sdk, accounts, shieldValue, ...accounts));

    // setting bridge subsidy to 0 for both bridges
    await setBridgeSubsidy(sdk, provider, bridgeAddressId, 0);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should make a defi deposit and then withdraw', async () => {
    const debugBalance = async (assetId: number) =>
      debug(`balance: ${sdk.fromBaseUnits(await sdk.getBalance(userIds[0], assetId), true)}`);

    const bridgeCallData = new BridgeCallData(bridgeAddressId, ethAssetId, tokenAAssetId);

    // Rollup 1.
    // Account 0 swaps ETH to token A.
    {
      const { inputAssetIdA, outputAssetIdA } = bridgeCallData;

      await debugBalance(inputAssetIdA);
      await debugBalance(outputAssetIdA);

      const depositValue = sdk.toBaseUnits(inputAssetIdA, '0.05');
      const ethToTokenAFees = await sdk.getDefiFees(bridgeCallData, {
        userId: userIds[0],
        assetValue: depositValue,
      });

      // Note: using deadline instead of instant to check subsidy
      const fee = ethToTokenAFees[DefiSettlementTime.DEADLINE];

      debug(
        `swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(fee)}) for ${
          sdk.getAssetInfo(outputAssetIdA).symbol
        }...`,
      );

      const controller = sdk.createDefiController(userIds[0], signers[0], bridgeCallData, depositValue, fee);
      await controller.createProof();
      await controller.send();

      debug(`flush rollup (underpaid bridge)`);
      await sdk.flushRollup(userIds[1], signers[1]);

      let [defiTx] = await sdk.getDefiTxs(userIds[0]);
      debug(`State: ${defiTx.interactionResult.state}`);
      expect(defiTx.interactionResult.state).toBe('PENDING');

      debug(`Raising bridge subsidy`);
      await raiseBridgeSubsidy(sdk, provider, [bridgeAddressId], 0, 500000);

      debug(`flush rollup (overpaid bridge)`);
      await sdk.flushRollup(userIds[1], signers[1]);

      debug(`waiting for defi interaction to complete...`);
      [defiTx] = await sdk.getDefiTxs(userIds[0]);
      debug(`State: ${defiTx.interactionResult.state}`);
      expect(defiTx.interactionResult.state).toBe('AWAITING_FINALISATION');

      // Process async defi interactions
      const nonce = await controller.getInteractionNonce();
      expect(nonce).toBeDefined();
      debug(`finalising interaction with nonce ${nonce}...`);
      const txHash = await sdk.processAsyncDefiInteraction(nonce!);
      await sdk.getTransactionReceipt(txHash);

      debug(`flush rollup (overpaid bridge)`);
      await sdk.flushRollup(userIds[1], signers[1]);

      [defiTx] = await sdk.getDefiTxs(userIds[0]);
      debug(`State: ${defiTx.interactionResult.state}`);
      expect(defiTx.interactionResult.state).toBe('AWAITING_SETTLEMENT');

      await controller.awaitDefiFinalisation();

      debug(`flush rollup (overpaid bridge)`);
      await sdk.flushRollup(userIds[1], signers[1]);

      debug('waiting for claim to settle...');
      await controller.awaitSettlement();

      await debugBalance(inputAssetIdA);
      await debugBalance(outputAssetIdA);

      [defiTx] = await sdk.getDefiTxs(userIds[0]);
      debug(`State: ${defiTx.interactionResult.state}`);
      expect(defiTx.interactionResult.state).toBe('SETTLED');

      const expectedInputBalance = shieldValue.value - depositValue.value - fee.value;
      expect(defiTx).toMatchObject({ bridgeCallData: bridgeCallData, depositValue, fee });
      //expect(defiTx.interactionResult.state).toBe('SETTLED');
      expect(defiTx.interactionResult).toMatchObject({ isAsync: true, success: true });
      expect((await sdk.getBalance(userIds[0], inputAssetIdA)).value).toBe(expectedInputBalance);
      expect((await sdk.getBalance(userIds[0], outputAssetIdA)).value).toBe(
        defiTx.interactionResult.outputValueA!.value,
      );
    }
  });
});
