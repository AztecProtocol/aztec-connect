import {
  AccountId,
  AztecSdk,
  BridgeId,
  createAztecSdk,
  DefiSettlementTime,
  EthAddress,
  toBaseUnits,
  TxSettlementTime,
  WalletProvider,
} from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { asyncMap } from './async_map';
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
 * blockchain: yarn start:ganache:fork
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_lido
 */
describe('end-to-end defi tests', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let accounts: EthAddress[] = [];
  const userIds: AccountId[] = [];
  const debug = createDebug('bb:e2e_lido');

  const flushClaim = async () => {
    const signer = await sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[1])!);
    await sdk.flushRollup(userIds[1], signer);
  };

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex');
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, 2, privateKey, toBaseUnits('0.2', 18));
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
    const debugBalance = async (assetId: number) =>
      debug(`balance: ${sdk.fromBaseUnits(await sdk.getBalanceAv(assetId, userIds[0]), true)}`);

    const shieldValue = sdk.toBaseUnits(0, '0.08');
    const bridgeAddressId = 2;
    const ethAssetId = 0;
    const wstETHAssetId = 2;
    const ethToWstETHBridge = new BridgeId(bridgeAddressId, ethAssetId, wstETHAssetId);
    const ethToWstETHFees = await sdk.getDefiFees(ethToWstETHBridge);

    // Rollup 0.
    // Shield.
    {
      const depositFees = await sdk.getDepositFees(shieldValue.assetId);

      // Each account deposits funds to the contract in parallel. Await till they all complete.
      const controllers = await asyncMap(accounts, async (depositor, i) => {
        debug(`shielding ${sdk.fromBaseUnits(shieldValue, true)} from ${depositor.toString()}...`);

        const signer = await sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
        // Last deposit pays for instant rollup to flush.
        const fee = depositFees[i == accounts.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP];
        const controller = sdk.createDepositController(userIds[i], signer, shieldValue, fee, depositor);
        await controller.createProof();
        await controller.depositFundsToContractWithProofApproval();
        await controller.awaitDepositFundsToContract();
        await controller.send();
        return controller;
      });

      debug(`waiting for shields to settle...`);
      await Promise.all(controllers.map(controller => controller.awaitSettlement()));
    }

    // Rollup 1.
    // Account 0 swaps ETH to wstETH.
    {
      const signer = await sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[0])!);
      const { inputAssetIdA, outputAssetIdA } = ethToWstETHBridge;

      await debugBalance(inputAssetIdA);
      await debugBalance(outputAssetIdA);

      const depositValue = sdk.toBaseUnits(inputAssetIdA, '0.05');
      const fee = ethToWstETHFees[DefiSettlementTime.INSTANT];

      debug(
        `swapping ${sdk.fromBaseUnits(depositValue, true)} (fee: ${sdk.fromBaseUnits(fee)}) for ${
          sdk.getAssetInfo(outputAssetIdA).symbol
        }...`,
      );

      const controller = sdk.createDefiController(userIds[0], signer, ethToWstETHBridge, depositValue, fee);
      await controller.createProof();
      await controller.send();

      debug(`waiting for defi interaction to complete...`);
      await controller.awaitDefiFinalisation();

      debug('waiting for claim to settle...');
      await flushClaim();
      await controller.awaitSettlement();

      await debugBalance(inputAssetIdA);
      await debugBalance(outputAssetIdA);

      const [defiTx] = await sdk.getDefiTxs(userIds[0]);
      const expectedInputBalance = shieldValue.value - depositValue.value - fee.value;
      expect(defiTx).toMatchObject({ bridgeId: ethToWstETHBridge, depositValue, fee });
      expect(defiTx.interactionResult).toMatchObject({ isAsync: false, success: true });
      expect(await sdk.getBalance(inputAssetIdA, userIds[0])).toBe(expectedInputBalance);
      expect(await sdk.getBalance(outputAssetIdA, userIds[0])).toBe(defiTx.interactionResult.outputValueA!.value);
    }
  });
});
