import {
  AccountId,
  AssetId,
  BridgeId,
  BitConfig,
  createWalletSdk,
  EthAddress,
  TxType,
  WalletProvider,
  WalletSdk,
  toBaseUnits,
  JoinSplitProofOutput,
  DefiProofOutput
} from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(20 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

/**
 * Run the following:
 * blockchain: yarn start:ganache
 * halloumi: yarn start:dev
 * falafel: yarn start:dev
 * end-to-end: yarn test e2e_defi
 */

describe('end-to-end defi tests', () => {
  let provider: WalletProvider;
  let sdk: WalletSdk;
  let accounts: EthAddress[] = [];
  const userIds: AccountId[] = [];
  const awaitSettlementTimeout = 600;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 3, undefined, undefined, toBaseUnits('0.2', 18));
    accounts = provider.getAccounts();

    sdk = await createWalletSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      memoryDb: true,
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.init();
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
    const depositProofs: JoinSplitProofOutput[] = [];
    const signatures: Buffer[] = [];
    const shieldValue = sdk.toBaseUnits(AssetId.ETH, '0.08');
    for (let i = 0; i < accounts.length; i++) {
      const depositor = accounts[i];
      const assetId = AssetId.ETH;
      // flush the final transaction through by paying for all the remaining slots in the rollup, hence 4 * Deposit fee
      const txFee = (i === accounts.length - 1 ? 4n : 1n) * (await sdk.getFee(assetId, TxType.DEPOSIT));
      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
      const proofOutput = await sdk.createDepositProof(assetId, depositor, userIds[i], shieldValue, txFee, signer);
      const signature = await sdk.signProof(proofOutput, depositor);
      depositProofs.push(proofOutput);
      signatures.push(signature);
      const txHash = await sdk.depositFundsToContract(assetId, depositor, shieldValue + txFee);
      await sdk.getTransactionReceipt(txHash);
    }

    // send all of the deposit proofs together
    const depositPromises = depositProofs.map((p, i) => {
      return sdk.sendProof(p, signatures[i]);
    });
    // wait for them all to settle
    const depositHashes = await Promise.all(depositPromises);
    await Promise.all(
      depositHashes.map((hash) => {
        return sdk.awaitSettlement(hash, awaitSettlementTimeout);
      }),
    );

    // Account 1 will swap part of it's ETH for DAI. Then, once this has settled, it will swap that DAI back to ETH whilst accounts 2 and 3 swap their ETH for DAI
    // Defi deposit - account 1 swaps partial ETH to DAI
    {
      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[0])!);
      const bridgeAddressId = 1;
      const inputAssetId = AssetId.ETH;
      const outputAssetIdA = AssetId.DAI;
      const outputAssetIdB = 0;
      const bridgeId = new BridgeId(
        bridgeAddressId,
        inputAssetId,
        outputAssetIdA,
        outputAssetIdB,
        0,
        new BitConfig(false, false, false, false, false, false),
        0,
      );
      const txFee =
        (await sdk.getFee(inputAssetId, TxType.DEFI_DEPOSIT)) + 5n * (await sdk.getFee(inputAssetId, TxType.TRANSFER)); // 5 * j/s fees to push the rollup through
      const depositValue = sdk.toBaseUnits(inputAssetId, '0.05');
      const proofOutput = await sdk.createDefiProof(bridgeId, userIds[0], depositValue, txFee, signer);
      const defiTxHash = await sdk.sendProof(proofOutput);

      // Await defi deposit tx to settle.
      await sdk.awaitSettlement(defiTxHash, awaitSettlementTimeout);

      const defiTxs = await sdk.getDefiTxs(userIds[0]);
      expect(defiTxs.length).toBe(1);
      const defiTx = defiTxs[0];
      expect(defiTx).toMatchObject({
        bridgeId,
        depositValue,
        txFee,
        outputValueB: 0n,
      });
      expect(sdk.getBalance(inputAssetId, userIds[0])).toBe(shieldValue - depositValue - txFee);
      expect(sdk.getBalance(outputAssetIdA, userIds[0])).toBe(defiTx.outputValueA);
    }

    // Account 1 has some DAI, accounts 2 and 3 have ETH
    // We will have them all convert their asset for the other (ETH -> DAI/DAI -> ETH) in the same rollup
    const defiProofs: DefiProofOutput[] = [];
    const defiVerifications: Array<() => Promise<void>> = [];

    // Defi deposit - account 1 swaps all DAI to ETH
    {
      const bridgeAddressId = 2;
      const inputAssetId = AssetId.DAI;
      const bridgeId = new BridgeId(
        bridgeAddressId,
        inputAssetId,
        AssetId.ETH,
        0,
        0,
        new BitConfig(false, false, false, false, false, false),
        0,
      );

      const initialEthBalance = sdk.getBalance(AssetId.ETH, userIds[0]);
      const initialDaiBalance = sdk.getBalance(AssetId.DAI, userIds[0]);

      // increase the fee to pay for the whole bridge. this will ensure that this defi deposit will get rolled up with the others
      const txFee = (await sdk.getFee(inputAssetId, TxType.DEFI_DEPOSIT)) * 2n;
      const depositValue = initialDaiBalance - txFee;

      const allowChain = true;
      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[0])!);
      const proofOutput = await sdk.createDefiProof(bridgeId, userIds[0], depositValue, txFee, signer, allowChain);
      defiProofs.push(proofOutput);

      const verification = async () => {
        const defiTxs = await sdk.getDefiTxs(userIds[0]);
        expect(defiTxs.length).toBe(2);
        const defiTx = defiTxs[0];

        expect(defiTx).toMatchObject({
          bridgeId,
          depositValue,
          txFee,
          outputValueB: 0n,
        });
        expect(sdk.getBalance(AssetId.ETH, userIds[0])).toBe(initialEthBalance + defiTx.outputValueA);
        expect(sdk.getBalance(AssetId.DAI, userIds[0])).toBe(0n);
      };
      defiVerifications.push(verification);
    }

    // Defi deposits - accounts 2 and 3 swap partial ETH to DAI
    for (let i = 1; i < accounts.length; i++) {
      const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(accounts[i])!);
      const bridgeAddressId = 1;
      const inputAssetId = AssetId.ETH;
      const outputAssetIdA = AssetId.DAI;
      const outputAssetIdB = 0;
      const bridgeId = new BridgeId(
        bridgeAddressId,
        inputAssetId,
        outputAssetIdA,
        outputAssetIdB,
        0,
        new BitConfig(false, false, false, false, false, false),
        0,
      );
      const txFee =
        (await sdk.getFee(inputAssetId, TxType.DEFI_DEPOSIT)) + 5n * (await sdk.getFee(inputAssetId, TxType.TRANSFER)); // 5 * j/s fees to push the rollup through
      const depositValue = sdk.toBaseUnits(inputAssetId, '0.05');
      const proofOutput = await sdk.createDefiProof(bridgeId, userIds[i], depositValue, txFee, signer);
      defiProofs.push(proofOutput);

      const verification = async () => {
        const defiTxs = await sdk.getDefiTxs(userIds[i]);
        expect(defiTxs.length).toBe(1);
        const defiTx = defiTxs[0];
        expect(defiTx).toMatchObject({
          bridgeId,
          depositValue,
          txFee,
          outputValueB: 0n,
        });
        expect(sdk.getBalance(inputAssetId, userIds[i])).toBe(shieldValue - depositValue - txFee);
        expect(sdk.getBalance(outputAssetIdA, userIds[i])).toBe(defiTx.outputValueA);
      };
      defiVerifications.push(verification);
    }

    // send all of the proofs together
    const defiHashes = await Promise.all(
      defiProofs.map(proof => {
        return sdk.sendProof(proof);
      }),
    );
    // now wait for everything to settle
    await Promise.all(
      defiHashes.map(hash => {
        return sdk.awaitSettlement(hash, awaitSettlementTimeout);
      }),
    );
    // check the results of each one
    await Promise.all(defiVerifications.map(x => x()));
  });
});
