import { EthAddress } from '@aztec/barretenberg/address';
import { BridgeCallData, virtualAssetIdFlag, virtualAssetIdPlaceholder } from '@aztec/barretenberg/bridge_call_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { randomBytes } from '@aztec/barretenberg/crypto';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomCoreAccountTx, randomCoreDefiTx, randomCorePaymentTx } from '../core_tx/fixtures.js';
import { CoreUserTx } from '../core_tx/index.js';
import {
  UserAccountTx,
  UserDefiClaimTx,
  UserDefiInteractionResultState,
  UserDefiTx,
  UserPaymentTx,
} from '../user_tx/index.js';
import { groupTxs } from './group_txs.js';

const createTxRefNo = () => randomBytes(4).readUInt32BE(0);

const createFeeTx = (fee: bigint, txRefNo: number) =>
  randomCorePaymentTx({
    proofId: ProofId.SEND,
    privateInput: fee,
    isRecipient: true,
    isSender: true,
    txRefNo,
  });

const createDepositTx = ({ publicValue = 0n, fee = 0n, assetId = 0, txRefNo = 0 } = {}) =>
  randomCorePaymentTx({
    proofId: ProofId.DEPOSIT,
    assetId,
    publicValue,
    publicOwner: EthAddress.random(),
    recipientPrivateOutput: publicValue - fee,
    isRecipient: true,
    isSender: false,
    txRefNo,
  });

const createWithdrawTx = ({
  publicValue = 0n,
  fee = 0n,
  privateInput = publicValue + fee,
  assetId = 0,
  txRefNo = 0,
} = {}) =>
  randomCorePaymentTx({
    proofId: ProofId.WITHDRAW,
    assetId,
    publicValue,
    publicOwner: EthAddress.random(),
    privateInput,
    senderPrivateOutput: privateInput - fee - publicValue,
    isSender: true,
    isRecipient: false,
    txRefNo,
  });

const createChainedTxs = (values: bigint[]) =>
  values.map(value =>
    randomCorePaymentTx({
      proofId: ProofId.SEND,
      privateInput: value,
      senderPrivateOutput: value,
      recipientPrivateOutput: 0n,
      isSender: true,
      isRecipient: true,
    }),
  );

describe('groupTxs', () => {
  const garbageAssetId = 123;
  const now = Date.now();

  const expectGroupedUserTxs = (
    coreTxs: CoreUserTx[],
    expected: (UserAccountTx | UserDefiTx | UserDefiClaimTx | UserPaymentTx)[],
  ) => {
    expect(groupTxs(coreTxs)).toEqual(expected);
    expect(groupTxs([...coreTxs].reverse())).toEqual(expected);
  };

  describe('account tx', () => {
    it('recover account tx without fee and deposit', () => {
      const accountTx = randomCoreAccountTx();
      expectGroupedUserTxs(
        [accountTx],
        [
          new UserAccountTx(
            accountTx.txId,
            accountTx.accountPublicKey,
            accountTx.aliasHash,
            accountTx.newSpendingPublicKey1,
            accountTx.newSpendingPublicKey2,
            accountTx.migrated,
            { assetId: 0, value: 0n },
            accountTx.created,
          ),
        ],
      );
    });

    it('recover account tx with fee and deposit', () => {
      const txRefNo = createTxRefNo();
      const accountTx = randomCoreAccountTx({ txRefNo });
      const depositAndFeeTx = createDepositTx({ publicValue: 100n, fee: 20n, txRefNo });
      expectGroupedUserTxs(
        [depositAndFeeTx, accountTx],
        [
          new UserPaymentTx(
            depositAndFeeTx.txId,
            depositAndFeeTx.accountPublicKey,
            ProofId.DEPOSIT,
            { assetId: 0, value: 80n },
            { assetId: 0, value: 20n },
            depositAndFeeTx.publicOwner,
            false,
            depositAndFeeTx.created,
          ),
          new UserAccountTx(
            accountTx.txId,
            accountTx.accountPublicKey,
            accountTx.aliasHash,
            accountTx.newSpendingPublicKey1,
            accountTx.newSpendingPublicKey2,
            accountTx.migrated,
            { assetId: 0, value: 0n },
            accountTx.created,
          ),
        ],
      );
    });

    it('recover account tx with fee paid by deposit', () => {
      const txRefNo = createTxRefNo();
      const accountTx = randomCoreAccountTx({ txRefNo });
      const depositAndFeeTx = createDepositTx({ publicValue: 20n, fee: 20n, txRefNo });
      expectGroupedUserTxs(
        [accountTx, depositAndFeeTx],
        [
          new UserAccountTx(
            accountTx.txId,
            accountTx.accountPublicKey,
            accountTx.aliasHash,
            accountTx.newSpendingPublicKey1,
            accountTx.newSpendingPublicKey2,
            accountTx.migrated,
            { assetId: 0, value: 20n },
            accountTx.created,
          ),
        ],
      );
    });

    it('recover account tx with fee paid by private send', () => {
      const txRefNo = createTxRefNo();
      const accountTx = randomCoreAccountTx({ txRefNo });
      const feeTx = createFeeTx(20n, txRefNo);
      expectGroupedUserTxs(
        [accountTx, feeTx],
        [
          new UserAccountTx(
            accountTx.txId,
            accountTx.accountPublicKey,
            accountTx.aliasHash,
            accountTx.newSpendingPublicKey1,
            accountTx.newSpendingPublicKey2,
            accountTx.migrated,
            { assetId: 0, value: 20n },
            accountTx.created,
          ),
        ],
      );
    });
  });

  describe('deposit tx', () => {
    it('recover deposit tx', () => {
      const depositTx = createDepositTx({ publicValue: 100n, fee: 20n });
      expectGroupedUserTxs(
        [depositTx],
        [
          new UserPaymentTx(
            depositTx.txId,
            depositTx.accountPublicKey,
            ProofId.DEPOSIT,
            { assetId: 0, value: 80n },
            { assetId: 0, value: 20n },
            depositTx.publicOwner,
            false,
            depositTx.created,
          ),
        ],
      );
    });

    it('recover deposit tx with fee paying tx', () => {
      const txRefNo = createTxRefNo();
      const depositTx = createDepositTx({ assetId: garbageAssetId, publicValue: 80n, txRefNo });
      const feeTx = createFeeTx(20n, txRefNo);
      expectGroupedUserTxs(
        [depositTx, feeTx],
        [
          new UserPaymentTx(
            depositTx.txId,
            depositTx.accountPublicKey,
            ProofId.DEPOSIT,
            { assetId: garbageAssetId, value: 80n },
            { assetId: 0, value: 20n },
            depositTx.publicOwner,
            false,
            depositTx.created,
          ),
        ],
      );
    });
  });

  describe('withdraw tx', () => {
    it('recover withdraw tx', () => {
      const withdrawTx = createWithdrawTx({ publicValue: 80n, fee: 20n, privateInput: 200n });
      expectGroupedUserTxs(
        [withdrawTx],
        [
          new UserPaymentTx(
            withdrawTx.txId,
            withdrawTx.accountPublicKey,
            ProofId.WITHDRAW,
            { assetId: 0, value: 80n },
            { assetId: 0, value: 20n },
            withdrawTx.publicOwner,
            true,
            withdrawTx.created,
          ),
        ],
      );
    });

    it('recover withdraw tx with chained txs', () => {
      const chainedTxs = createChainedTxs([30n, 24n, 46n]);
      const withdrawTx = createWithdrawTx({ publicValue: 80n, fee: 20n, privateInput: 200n });
      expectGroupedUserTxs(
        [...chainedTxs, withdrawTx],
        [
          new UserPaymentTx(
            withdrawTx.txId,
            withdrawTx.accountPublicKey,
            ProofId.WITHDRAW,
            { assetId: 0, value: 80n },
            { assetId: 0, value: 20n },
            withdrawTx.publicOwner,
            true,
            withdrawTx.created,
          ),
        ],
      );
    });

    it('recover withdraw tx with fee paying asset', () => {
      const txRefNo = createTxRefNo();
      const withdrawTx = createWithdrawTx({ assetId: garbageAssetId, publicValue: 80n, txRefNo });
      const feeTx = createFeeTx(20n, txRefNo);
      expectGroupedUserTxs(
        [withdrawTx, feeTx],
        [
          new UserPaymentTx(
            withdrawTx.txId,
            withdrawTx.accountPublicKey,
            ProofId.WITHDRAW,
            { assetId: garbageAssetId, value: 80n },
            { assetId: 0, value: 20n },
            withdrawTx.publicOwner,
            true,
            withdrawTx.created,
          ),
        ],
      );
    });
  });

  describe('transfer tx', () => {
    it('recover transfer tx sent to user itself', () => {
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        privateInput: 100n,
        senderPrivateOutput: 5n,
        recipientPrivateOutput: 80n,
        isSender: true,
        isRecipient: true,
      });
      expectGroupedUserTxs(
        [sendTx],
        [
          new UserPaymentTx(
            sendTx.txId,
            sendTx.accountPublicKey,
            ProofId.SEND,
            { assetId: 0, value: 80n },
            { assetId: 0, value: 15n },
            undefined,
            true,
            sendTx.created,
          ),
        ],
      );
    });

    it('does not return a fee tx', () => {
      const txRefNo = createTxRefNo();
      const feeTx = createFeeTx(20n, txRefNo);
      expectGroupedUserTxs([feeTx], []);
    });

    it('recover transfer tx sent to another user', () => {
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        privateInput: 100n,
        senderPrivateOutput: 5n,
        recipientPrivateOutput: 80n,
        isSender: true,
        isRecipient: false,
      });
      expectGroupedUserTxs(
        [sendTx],
        [
          new UserPaymentTx(
            sendTx.txId,
            sendTx.accountPublicKey,
            ProofId.SEND,
            { assetId: 0, value: 80n },
            { assetId: 0, value: 15n },
            undefined,
            true,
            sendTx.created,
          ),
        ],
      );
    });

    it('recover transfer tx sent to another user with chained txs', () => {
      const chainedTxs = createChainedTxs([30n, 24n, 46n]);
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        privateInput: 100n,
        senderPrivateOutput: 5n,
        recipientPrivateOutput: 80n,
        isSender: true,
        isRecipient: false,
      });
      expectGroupedUserTxs(
        [...chainedTxs, sendTx],
        [
          new UserPaymentTx(
            sendTx.txId,
            sendTx.accountPublicKey,
            ProofId.SEND,
            { assetId: 0, value: 80n },
            { assetId: 0, value: 15n },
            undefined,
            true,
            sendTx.created,
          ),
        ],
      );
    });

    it('recover transfer tx sent to another user without recipient state', () => {
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        privateInput: 100n,
        senderPrivateOutput: 5n,
        recipientPrivateOutput: 0n, // <--
        isSender: true,
        isRecipient: false,
      });
      expectGroupedUserTxs(
        [sendTx],
        [
          new UserPaymentTx(
            sendTx.txId,
            sendTx.accountPublicKey,
            ProofId.SEND,
            { assetId: 0, value: 95n },
            { assetId: 0, value: 0n },
            undefined,
            true,
            sendTx.created,
          ),
        ],
      );
    });

    it('recover transfer tx sent to us', () => {
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        recipientPrivateOutput: 80n,
        isRecipient: true,
        isSender: false,
      });
      expectGroupedUserTxs(
        [sendTx],
        [
          new UserPaymentTx(
            sendTx.txId,
            sendTx.accountPublicKey,
            ProofId.SEND,
            { assetId: 0, value: 80n },
            { assetId: 0, value: 0n },
            undefined,
            false,
            sendTx.created,
          ),
        ],
      );
    });

    it('recover transfer tx sent to another user with fee paying tx', () => {
      const txRefNo = createTxRefNo();
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        assetId: garbageAssetId,
        privateInput: 100n,
        senderPrivateOutput: 15n,
        recipientPrivateOutput: 85n,
        isSender: true,
        isRecipient: false,
        txRefNo,
      });
      const feeTx = createFeeTx(20n, txRefNo);
      expectGroupedUserTxs(
        [sendTx, feeTx],
        [
          new UserPaymentTx(
            sendTx.txId,
            sendTx.accountPublicKey,
            ProofId.SEND,
            { assetId: garbageAssetId, value: 85n },
            { assetId: 0, value: 20n },
            undefined,
            true,
            sendTx.created,
          ),
        ],
      );
    });

    it('recover transfer tx sent to another user with fee paying tx and without recipient state', () => {
      const txRefNo = createTxRefNo();
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        assetId: garbageAssetId,
        privateInput: 100n,
        senderPrivateOutput: 15n,
        recipientPrivateOutput: 0n, // <--
        isSender: true,
        isRecipient: false,
        txRefNo,
      });
      const feeTx = createFeeTx(20n, txRefNo);
      expectGroupedUserTxs(
        [sendTx, feeTx],
        [
          new UserPaymentTx(
            sendTx.txId,
            sendTx.accountPublicKey,
            ProofId.SEND,
            { assetId: garbageAssetId, value: 85n },
            { assetId: 0, value: 20n },
            undefined,
            true,
            sendTx.created,
          ),
        ],
      );
    });
  });

  describe('defi tx', () => {
    const bridgeCallData = BridgeCallData.ZERO;
    const garbageBridgeCallData = new BridgeCallData(0, garbageAssetId, 0);

    it('recover defi tx', () => {
      const defiTx = randomCoreDefiTx({ bridgeCallData });
      expectGroupedUserTxs(
        [defiTx],
        [
          new UserDefiTx(
            defiTx.txId,
            defiTx.accountPublicKey,
            bridgeCallData,
            { assetId: 0, value: defiTx.depositValue },
            { assetId: 0, value: defiTx.txFee },
            defiTx.created,
            undefined,
            {
              state: UserDefiInteractionResultState.PENDING,
              isAsync: undefined,
              interactionNonce: undefined,
              success: undefined,
              outputValueA: undefined,
              outputValueB: undefined,
              claimSettled: undefined,
              finalised: undefined,
            },
          ),
        ],
      );
    });

    it('recover defi tx with chained txs', () => {
      const chainedTxs = createChainedTxs([20n, 30n, 50n]);
      const defiTx = randomCoreDefiTx({ bridgeCallData });
      expectGroupedUserTxs(
        [...chainedTxs, defiTx],
        [
          new UserDefiTx(
            defiTx.txId,
            defiTx.accountPublicKey,
            bridgeCallData,
            { assetId: 0, value: defiTx.depositValue },
            { assetId: 0, value: defiTx.txFee },
            defiTx.created,
            undefined,
            {
              state: UserDefiInteractionResultState.PENDING,
              isAsync: undefined,
              interactionNonce: undefined,
              success: undefined,
              outputValueA: undefined,
              outputValueB: undefined,
              claimSettled: undefined,
              finalised: undefined,
            },
          ),
        ],
      );
    });

    it('recover deposited defi tx', () => {
      const defiTx = randomCoreDefiTx({
        bridgeCallData,
        success: true,
        outputValueA: 123n,
        settled: new Date(),
        interactionNonce: 45,
        isAsync: true,
      });
      expectGroupedUserTxs(
        [defiTx],
        [
          new UserDefiTx(
            defiTx.txId,
            defiTx.accountPublicKey,
            bridgeCallData,
            { assetId: 0, value: defiTx.depositValue },
            { assetId: 0, value: defiTx.txFee },
            defiTx.created,
            defiTx.settled,
            {
              state: UserDefiInteractionResultState.AWAITING_FINALISATION,
              isAsync: true,
              interactionNonce: 45,
              success: true,
              outputValueA: { assetId: bridgeCallData.outputAssetIdA, value: 123n },
              outputValueB: undefined,
              claimSettled: undefined,
              finalised: undefined,
            },
          ),
        ],
      );
    });

    it('assign correct asset id for virtual output assets', () => {
      const bridgeCallData = new BridgeCallData(0, 0, virtualAssetIdPlaceholder, 2, virtualAssetIdPlaceholder);
      const defiTx = randomCoreDefiTx({
        bridgeCallData,
        success: true,
        outputValueA: 23n,
        outputValueB: 45n,
        settled: new Date(),
        interactionNonce: 678,
        isAsync: true,
      });
      expectGroupedUserTxs(
        [defiTx],
        [
          new UserDefiTx(
            defiTx.txId,
            defiTx.accountPublicKey,
            bridgeCallData,
            { assetId: 0, value: defiTx.depositValue },
            { assetId: 0, value: defiTx.txFee },
            defiTx.created,
            defiTx.settled,
            {
              state: UserDefiInteractionResultState.AWAITING_FINALISATION,
              isAsync: true,
              interactionNonce: 678,
              success: true,
              outputValueA: { assetId: virtualAssetIdFlag + 678, value: 23n },
              outputValueB: { assetId: virtualAssetIdFlag + 678, value: 45n },
              claimSettled: undefined,
              finalised: undefined,
            },
          ),
        ],
      );
    });

    it('recover finalised defi tx with pending claim', () => {
      const bridgeCallData = new BridgeCallData(0, 0, 1, 2, 3);
      const defiTx = randomCoreDefiTx({
        bridgeCallData,
        success: true,
        outputValueA: 23n,
        outputValueB: 45n,
        interactionNonce: 678,
        isAsync: true,
        settled: new Date(now),
        finalised: new Date(now + 1),
      });
      expectGroupedUserTxs(
        [defiTx],
        [
          new UserDefiClaimTx(
            undefined,
            defiTx.txId,
            defiTx.accountPublicKey,
            bridgeCallData,
            { assetId: 0, value: defiTx.depositValue },
            true,
            { assetId: 1, value: 23n },
            { assetId: 3, value: 45n },
            defiTx.finalised!,
            undefined,
          ),
          new UserDefiTx(
            defiTx.txId,
            defiTx.accountPublicKey,
            bridgeCallData,
            { assetId: 0, value: defiTx.depositValue },
            { assetId: 0, value: defiTx.txFee },
            defiTx.created,
            defiTx.settled,
            {
              state: UserDefiInteractionResultState.AWAITING_SETTLEMENT,
              isAsync: true,
              interactionNonce: 678,
              success: true,
              outputValueA: { assetId: 1, value: 23n },
              outputValueB: { assetId: 3, value: 45n },
              claimSettled: undefined,
              finalised: defiTx.finalised,
            },
          ),
        ],
      );
    });

    it('recover settled defi tx and settled claim tx', () => {
      const claimTxId = TxId.random();
      const bridgeCallData = new BridgeCallData(0, 0, 1, undefined, virtualAssetIdPlaceholder);
      const defiTx = randomCoreDefiTx({
        bridgeCallData,
        success: true,
        outputValueA: 23n,
        outputValueB: 45n,
        interactionNonce: 678,
        isAsync: true,
        settled: new Date(now),
        finalised: new Date(now + 1),
        claimSettled: new Date(now + 2),
        claimTxId,
      });
      expectGroupedUserTxs(
        [defiTx],
        [
          new UserDefiClaimTx(
            claimTxId,
            defiTx.txId,
            defiTx.accountPublicKey,
            bridgeCallData,
            { assetId: 0, value: defiTx.depositValue },
            true,
            { assetId: bridgeCallData.outputAssetIdA, value: 23n },
            { assetId: virtualAssetIdFlag + 678, value: 45n },
            defiTx.finalised!,
            defiTx.claimSettled!,
          ),
          new UserDefiTx(
            defiTx.txId,
            defiTx.accountPublicKey,
            bridgeCallData,
            { assetId: 0, value: defiTx.depositValue },
            { assetId: 0, value: defiTx.txFee },
            defiTx.created,
            defiTx.settled,
            {
              state: UserDefiInteractionResultState.SETTLED,
              isAsync: true,
              interactionNonce: 678,
              success: true,
              outputValueA: { assetId: bridgeCallData.outputAssetIdA, value: 23n },
              outputValueB: { assetId: virtualAssetIdFlag + 678, value: 45n },
              claimSettled: defiTx.claimSettled,
              finalised: defiTx.finalised,
            },
          ),
        ],
      );
    });

    it('recover defi tx with join split tx', () => {
      const txRefNo = createTxRefNo();
      const jsTx = randomCorePaymentTx({
        privateInput: 110n,
        senderPrivateOutput: 80n,
        recipientPrivateOutput: 10n,
        txRefNo,
      });
      const defiTx = randomCoreDefiTx({ bridgeCallData, txFee: 0n, txRefNo });
      expectGroupedUserTxs(
        [jsTx, defiTx],
        [
          new UserDefiTx(
            defiTx.txId,
            defiTx.accountPublicKey,
            bridgeCallData,
            { assetId: 0, value: defiTx.depositValue },
            { assetId: 0, value: 20n },
            defiTx.created,
            undefined,
            {
              state: UserDefiInteractionResultState.PENDING,
              isAsync: undefined,
              interactionNonce: undefined,
              success: undefined,
              outputValueA: undefined,
              outputValueB: undefined,
              claimSettled: undefined,
              finalised: undefined,
            },
          ),
        ],
      );
    });

    it('recover defi tx with fee paying tx', () => {
      const txRefNo = createTxRefNo();
      const defiTx = randomCoreDefiTx({ bridgeCallData: garbageBridgeCallData, txFee: 0n, txRefNo });
      const feeTx = createFeeTx(20n, txRefNo);
      expectGroupedUserTxs(
        [defiTx, feeTx],
        [
          new UserDefiTx(
            defiTx.txId,
            defiTx.accountPublicKey,
            garbageBridgeCallData,
            { assetId: garbageAssetId, value: defiTx.depositValue },
            { assetId: 0, value: 20n },
            defiTx.created,
            undefined,
            {
              state: UserDefiInteractionResultState.PENDING,
              isAsync: undefined,
              interactionNonce: undefined,
              success: undefined,
              outputValueA: undefined,
              outputValueB: undefined,
              claimSettled: undefined,
              finalised: undefined,
            },
          ),
        ],
      );
    });

    it('recover defi tx with join split tx and fee paying tx', () => {
      const txRefNo = createTxRefNo();
      const jsTx = randomCorePaymentTx({
        assetId: garbageAssetId,
        privateInput: 90n,
        senderPrivateOutput: 80n,
        recipientPrivateOutput: 10n,
        txRefNo,
      });
      const defiTx = randomCoreDefiTx({ bridgeCallData: garbageBridgeCallData, txFee: 0n, txRefNo });
      const feeTx = createFeeTx(20n, txRefNo);
      expectGroupedUserTxs(
        [jsTx, defiTx, feeTx],
        [
          new UserDefiTx(
            defiTx.txId,
            defiTx.accountPublicKey,
            garbageBridgeCallData,
            { assetId: garbageAssetId, value: defiTx.depositValue },
            { assetId: 0, value: 20n },
            defiTx.created,
            undefined,
            {
              state: UserDefiInteractionResultState.PENDING,
              isAsync: undefined,
              interactionNonce: undefined,
              success: undefined,
              outputValueA: undefined,
              outputValueB: undefined,
              claimSettled: undefined,
              finalised: undefined,
            },
          ),
        ],
      );
    });
  });
});
