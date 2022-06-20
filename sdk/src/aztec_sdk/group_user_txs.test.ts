import { EthAddress } from '@aztec/barretenberg/address';
import { BridgeId, virtualAssetIdFlag, virtualAssetIdPlaceholder } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';
import { createTxRefNo } from '../controllers/create_tx_ref_no';
import { randomCoreAccountTx, randomCoreDefiTx, randomCorePaymentTx } from '../core_tx/fixtures';
import { UserAccountTx, UserDefiClaimTx, UserDefiInteractionResultState, UserDefiTx, UserPaymentTx } from '../user_tx';
import { groupUserTxs } from './group_user_txs';

const createFeeTx = (fee: bigint, txRefNo: number) =>
  randomCorePaymentTx({
    proofId: ProofId.SEND,
    privateInput: fee,
    isRecipient: true,
    isSender: true,
    txRefNo,
  });

describe('groupUserTxs', () => {
  const garbageAssetId = 123;
  const now = Date.now();

  describe('account tx', () => {
    it('recover account tx without fee and deposit', () => {
      const accountTx = randomCoreAccountTx();
      expect(groupUserTxs([accountTx])).toEqual([
        new UserAccountTx(
          accountTx.txId,
          accountTx.userId,
          accountTx.aliasHash,
          accountTx.newSpendingPublicKey1,
          accountTx.newSpendingPublicKey2,
          accountTx.migrated,
          { assetId: 0, value: 0n },
          accountTx.created,
        ),
      ]);
    });

    it('recover account tx with fee and deposit', () => {
      const txRefNo = createTxRefNo();
      const accountTx = randomCoreAccountTx({ txRefNo });
      const depositAndFeeTx = randomCorePaymentTx({
        proofId: ProofId.DEPOSIT,
        publicOwner: EthAddress.random(),
        publicValue: 100n,
        senderPrivateOutput: 80n,
        txRefNo,
        created: new Date(now),
      });
      expect(groupUserTxs([accountTx, depositAndFeeTx])).toEqual([
        new UserAccountTx(
          accountTx.txId,
          accountTx.userId,
          accountTx.aliasHash,
          accountTx.newSpendingPublicKey1,
          accountTx.newSpendingPublicKey2,
          accountTx.migrated,
          { assetId: 0, value: 0n },
          accountTx.created,
        ),
        new UserPaymentTx(
          depositAndFeeTx.txId,
          depositAndFeeTx.userId,
          ProofId.DEPOSIT,
          { assetId: 0, value: 80n },
          { assetId: 0, value: 20n },
          depositAndFeeTx.publicOwner,
          true,
          depositAndFeeTx.created,
        ),
      ]);
    });

    it('recover account tx with fee paid by deposit', () => {
      const txRefNo = createTxRefNo();
      const accountTx = randomCoreAccountTx({ txRefNo });
      const depositAndFeeTx = randomCorePaymentTx({
        proofId: ProofId.DEPOSIT,
        publicOwner: EthAddress.random(),
        publicValue: 20n,
        txRefNo,
      });
      expect(groupUserTxs([accountTx, depositAndFeeTx])).toEqual([
        new UserAccountTx(
          accountTx.txId,
          accountTx.userId,
          accountTx.aliasHash,
          accountTx.newSpendingPublicKey1,
          accountTx.newSpendingPublicKey2,
          accountTx.migrated,
          { assetId: 0, value: 20n },
          accountTx.created,
        ),
      ]);
    });

    it('recover account tx with fee paid by private send', () => {
      const txRefNo = createTxRefNo();
      const accountTx = randomCoreAccountTx({ txRefNo });
      const feeTx = createFeeTx(20n, txRefNo);
      expect(groupUserTxs([accountTx, feeTx])).toEqual([
        new UserAccountTx(
          accountTx.txId,
          accountTx.userId,
          accountTx.aliasHash,
          accountTx.newSpendingPublicKey1,
          accountTx.newSpendingPublicKey2,
          accountTx.migrated,
          { assetId: 0, value: 20n },
          accountTx.created,
        ),
      ]);
    });
  });

  describe('deposit tx', () => {
    it('recover deposit tx', () => {
      const depositTx = randomCorePaymentTx({
        proofId: ProofId.DEPOSIT,
        publicOwner: EthAddress.random(),
        publicValue: 100n,
        senderPrivateOutput: 80n,
      });
      expect(groupUserTxs([depositTx])).toEqual([
        new UserPaymentTx(
          depositTx.txId,
          depositTx.userId,
          ProofId.DEPOSIT,
          { assetId: 0, value: 80n },
          { assetId: 0, value: 20n },
          depositTx.publicOwner,
          true,
          depositTx.created,
        ),
      ]);
    });

    it('recover deposit tx with fee paying tx', () => {
      const txRefNo = createTxRefNo();
      const depositTx = randomCorePaymentTx({
        proofId: ProofId.DEPOSIT,
        publicOwner: EthAddress.random(),
        assetId: garbageAssetId,
        publicValue: 80n,
        senderPrivateOutput: 80n,
        txRefNo,
      });
      const feeTx = createFeeTx(20n, txRefNo);
      expect(groupUserTxs([depositTx, feeTx])).toEqual([
        new UserPaymentTx(
          depositTx.txId,
          depositTx.userId,
          ProofId.DEPOSIT,
          { assetId: garbageAssetId, value: 80n },
          { assetId: 0, value: 20n },
          depositTx.publicOwner,
          true,
          depositTx.created,
        ),
      ]);
    });

    it('recover deposit tx sent to another account', () => {
      const depositTx = randomCorePaymentTx({
        proofId: ProofId.DEPOSIT,
        publicOwner: EthAddress.random(),
        publicValue: 100n,
        recipientPrivateOutput: 80n,
        isRecipient: false,
      });
      expect(groupUserTxs([depositTx])).toEqual([
        new UserPaymentTx(
          depositTx.txId,
          depositTx.userId,
          ProofId.DEPOSIT,
          { assetId: 0, value: 80n },
          { assetId: 0, value: 20n },
          depositTx.publicOwner,
          true,
          depositTx.created,
        ),
      ]);
    });

    it('recover deposit tx sent to another account without local state', () => {
      const depositTx = randomCorePaymentTx({
        proofId: ProofId.DEPOSIT,
        publicOwner: EthAddress.random(),
        publicValue: 100n,
        isRecipient: false,
      });
      expect(groupUserTxs([depositTx])).toEqual([
        new UserPaymentTx(
          depositTx.txId,
          depositTx.userId,
          ProofId.DEPOSIT,
          { assetId: 0, value: 100n },
          { assetId: 0, value: 0n },
          depositTx.publicOwner,
          true,
          depositTx.created,
        ),
      ]);
    });

    it('recover deposit tx sent to us', () => {
      const depositTx = randomCorePaymentTx({
        proofId: ProofId.DEPOSIT,
        publicOwner: EthAddress.random(),
        publicValue: 100n,
        recipientPrivateOutput: 80n,
        isRecipient: true,
        isSender: false,
      });
      expect(groupUserTxs([depositTx])).toEqual([
        new UserPaymentTx(
          depositTx.txId,
          depositTx.userId,
          ProofId.DEPOSIT,
          { assetId: 0, value: 80n },
          { assetId: 0, value: 20n },
          depositTx.publicOwner,
          false,
          depositTx.created,
        ),
      ]);
    });
  });

  describe('withdraw tx', () => {
    it('recover withdraw tx', () => {
      const withdrawTx = randomCorePaymentTx({
        proofId: ProofId.WITHDRAW,
        publicOwner: EthAddress.random(),
        publicValue: 80n,
        privateInput: 100n,
      });
      expect(groupUserTxs([withdrawTx])).toEqual([
        new UserPaymentTx(
          withdrawTx.txId,
          withdrawTx.userId,
          ProofId.WITHDRAW,
          { assetId: 0, value: 80n },
          { assetId: 0, value: 20n },
          withdrawTx.publicOwner,
          true,
          withdrawTx.created,
        ),
      ]);
    });

    it('recover withdraw tx with fee paying asset', () => {
      const txRefNo = createTxRefNo();
      const withdrawTx = randomCorePaymentTx({
        proofId: ProofId.WITHDRAW,
        publicOwner: EthAddress.random(),
        assetId: garbageAssetId,
        publicValue: 80n,
        privateInput: 80n,
        txRefNo,
      });
      const feeTx = createFeeTx(20n, txRefNo);
      expect(groupUserTxs([withdrawTx, feeTx])).toEqual([
        new UserPaymentTx(
          withdrawTx.txId,
          withdrawTx.userId,
          ProofId.WITHDRAW,
          { assetId: garbageAssetId, value: 80n },
          { assetId: 0, value: 20n },
          withdrawTx.publicOwner,
          true,
          withdrawTx.created,
        ),
      ]);
    });
  });

  describe('transfer tx', () => {
    it('recover transfer tx sent to user itself', () => {
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        privateInput: 100n,
        recipientPrivateOutput: 80n,
      });
      expect(groupUserTxs([sendTx])).toEqual([
        new UserPaymentTx(
          sendTx.txId,
          sendTx.userId,
          ProofId.SEND,
          { assetId: 0, value: 80n },
          { assetId: 0, value: 20n },
          undefined,
          true,
          sendTx.created,
        ),
      ]);
    });

    it('recover fee tx', () => {
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        privateInput: 20n,
      });
      expect(groupUserTxs([sendTx])).toEqual([
        new UserPaymentTx(
          sendTx.txId,
          sendTx.userId,
          ProofId.SEND,
          { assetId: 0, value: 0n },
          { assetId: 0, value: 20n },
          undefined,
          true,
          sendTx.created,
        ),
      ]);
    });

    it('recover transfer tx sent to other user', () => {
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        privateInput: 100n,
        recipientPrivateOutput: 80n,
        isRecipient: false,
      });
      expect(groupUserTxs([sendTx])).toEqual([
        new UserPaymentTx(
          sendTx.txId,
          sendTx.userId,
          ProofId.SEND,
          { assetId: 0, value: 80n },
          { assetId: 0, value: 20n },
          undefined,
          true,
          sendTx.created,
        ),
      ]);
    });

    it('recover transfer tx sent to other user without local state', () => {
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        privateInput: 100n,
        isRecipient: false,
      });
      expect(groupUserTxs([sendTx])).toEqual([
        new UserPaymentTx(
          sendTx.txId,
          sendTx.userId,
          ProofId.SEND,
          { assetId: 0, value: 100n },
          { assetId: 0, value: 0n },
          undefined,
          true,
          sendTx.created,
        ),
      ]);
    });

    it('recover transfer tx sent to us', () => {
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        recipientPrivateOutput: 80n,
        isRecipient: true,
        isSender: false,
      });
      expect(groupUserTxs([sendTx])).toEqual([
        new UserPaymentTx(
          sendTx.txId,
          sendTx.userId,
          ProofId.SEND,
          { assetId: 0, value: 80n },
          { assetId: 0, value: 0n },
          undefined,
          false,
          sendTx.created,
        ),
      ]);
    });

    it('recover transfer tx sent to other user with fee paying tx', () => {
      const txRefNo = createTxRefNo();
      const sendTx = randomCorePaymentTx({
        proofId: ProofId.SEND,
        assetId: garbageAssetId,
        privateInput: 80n,
        recipientPrivateOutput: 80n,
        isRecipient: false,
        txRefNo,
      });
      const feeTx = createFeeTx(20n, txRefNo);
      expect(groupUserTxs([sendTx, feeTx])).toEqual([
        new UserPaymentTx(
          sendTx.txId,
          sendTx.userId,
          ProofId.SEND,
          { assetId: garbageAssetId, value: 80n },
          { assetId: 0, value: 20n },
          undefined,
          true,
          sendTx.created,
        ),
      ]);
    });
  });

  describe('defi tx', () => {
    const bridgeId = BridgeId.ZERO;
    const garbageBridgeId = new BridgeId(0, garbageAssetId, 0);

    it('recover defi tx', () => {
      const defiTx = randomCoreDefiTx({ bridgeId });
      expect(groupUserTxs([defiTx])).toEqual([
        new UserDefiTx(
          defiTx.txId,
          defiTx.userId,
          bridgeId,
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
      ]);
    });

    it('recover deposited defi tx', () => {
      const defiTx = randomCoreDefiTx({
        bridgeId,
        success: true,
        outputValueA: 123n,
        settled: new Date(),
        interactionNonce: 45,
        isAsync: true,
      });
      expect(groupUserTxs([defiTx])).toEqual([
        new UserDefiTx(
          defiTx.txId,
          defiTx.userId,
          bridgeId,
          { assetId: 0, value: defiTx.depositValue },
          { assetId: 0, value: defiTx.txFee },
          defiTx.created,
          defiTx.settled,
          {
            state: UserDefiInteractionResultState.AWAITING_FINALISATION,
            isAsync: true,
            interactionNonce: 45,
            success: true,
            outputValueA: { assetId: bridgeId.outputAssetIdA, value: 123n },
            outputValueB: undefined,
            claimSettled: undefined,
            finalised: undefined,
          },
        ),
      ]);
    });

    it('assign correct asset id for virtual output assets', () => {
      const bridgeId = new BridgeId(0, 0, virtualAssetIdPlaceholder, 2, virtualAssetIdPlaceholder);
      const defiTx = randomCoreDefiTx({
        bridgeId,
        success: true,
        outputValueA: 23n,
        outputValueB: 45n,
        settled: new Date(),
        interactionNonce: 678,
        isAsync: true,
      });
      expect(groupUserTxs([defiTx])).toEqual([
        new UserDefiTx(
          defiTx.txId,
          defiTx.userId,
          bridgeId,
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
      ]);
    });

    it('recover finalised defi tx with pending claim', () => {
      const bridgeId = new BridgeId(0, 0, 1, 2, 3);
      const defiTx = randomCoreDefiTx({
        bridgeId,
        success: true,
        outputValueA: 23n,
        outputValueB: 45n,
        interactionNonce: 678,
        isAsync: true,
        settled: new Date(now),
        finalised: new Date(now + 1),
      });
      expect(groupUserTxs([defiTx])).toEqual([
        new UserDefiClaimTx(
          undefined,
          defiTx.txId,
          defiTx.userId,
          bridgeId,
          { assetId: 0, value: defiTx.depositValue },
          true,
          { assetId: 1, value: 23n },
          { assetId: 3, value: 45n },
          defiTx.finalised!,
          undefined,
        ),
        new UserDefiTx(
          defiTx.txId,
          defiTx.userId,
          bridgeId,
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
      ]);
    });

    it('recover settled defi tx and settled claim tx', () => {
      const claimTxId = TxId.random();
      const bridgeId = new BridgeId(0, 0, 1, undefined, virtualAssetIdPlaceholder);
      const defiTx = randomCoreDefiTx({
        bridgeId,
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
      expect(groupUserTxs([defiTx])).toEqual([
        new UserDefiClaimTx(
          claimTxId,
          defiTx.txId,
          defiTx.userId,
          bridgeId,
          { assetId: 0, value: defiTx.depositValue },
          true,
          { assetId: bridgeId.outputAssetIdA, value: 23n },
          { assetId: virtualAssetIdFlag + 678, value: 45n },
          defiTx.finalised!,
          defiTx.claimSettled!,
        ),
        new UserDefiTx(
          defiTx.txId,
          defiTx.userId,
          bridgeId,
          { assetId: 0, value: defiTx.depositValue },
          { assetId: 0, value: defiTx.txFee },
          defiTx.created,
          defiTx.settled,
          {
            state: UserDefiInteractionResultState.SETTLED,
            isAsync: true,
            interactionNonce: 678,
            success: true,
            outputValueA: { assetId: bridgeId.outputAssetIdA, value: 23n },
            outputValueB: { assetId: virtualAssetIdFlag + 678, value: 45n },
            claimSettled: defiTx.claimSettled,
            finalised: defiTx.finalised,
          },
        ),
      ]);
    });

    it('recover defi tx with join split tx', () => {
      const txRefNo = createTxRefNo();
      const jsTx = randomCorePaymentTx({
        privateInput: 110n,
        senderPrivateOutput: 80n,
        recipientPrivateOutput: 10n,
        txRefNo,
      });
      const defiTx = randomCoreDefiTx({ bridgeId, txFee: 0n, txRefNo });
      expect(groupUserTxs([jsTx, defiTx])).toEqual([
        new UserDefiTx(
          defiTx.txId,
          defiTx.userId,
          bridgeId,
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
      ]);
    });

    it('recover defi tx with fee paying tx', () => {
      const txRefNo = createTxRefNo();
      const defiTx = randomCoreDefiTx({ bridgeId: garbageBridgeId, txFee: 0n, txRefNo });
      const feeTx = createFeeTx(20n, txRefNo);
      expect(groupUserTxs([defiTx, feeTx])).toEqual([
        new UserDefiTx(
          defiTx.txId,
          defiTx.userId,
          garbageBridgeId,
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
      ]);
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
      const defiTx = randomCoreDefiTx({ bridgeId: garbageBridgeId, txFee: 0n, txRefNo });
      const feeTx = createFeeTx(20n, txRefNo);
      expect(groupUserTxs([jsTx, defiTx, feeTx])).toEqual([
        new UserDefiTx(
          defiTx.txId,
          defiTx.userId,
          garbageBridgeId,
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
      ]);
    });
  });
});
