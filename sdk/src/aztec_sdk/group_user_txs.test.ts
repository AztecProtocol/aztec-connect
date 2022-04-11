import { EthAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';
import { createTxRefNo } from '../controllers/create_tx_ref_no';
import { randomCoreAccountTx, randomCoreDefiTx, randomCorePaymentTx } from '../core_tx/fixtures';
import { UserAccountTx, UserDefiInteractionResultState, UserDefiTx, UserDefiClaimTx, UserPaymentTx } from '../user_tx';
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
  const feePayingAssetIds = [0];
  const garbageAssetId = 123;

  describe('account tx', () => {
    it('recover account tx without fee and deposit', () => {
      const accountTx = randomCoreAccountTx();
      expect(groupUserTxs([accountTx], feePayingAssetIds)).toEqual([
        new UserAccountTx(
          accountTx.txId,
          accountTx.userId,
          accountTx.aliasHash,
          accountTx.newSigningPubKey1,
          accountTx.newSigningPubKey2,
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
        publicOwner: EthAddress.randomAddress(),
        publicValue: 100n,
        senderPrivateOutput: 80n,
        txRefNo,
      });
      expect(groupUserTxs([accountTx, depositAndFeeTx], feePayingAssetIds)).toEqual([
        new UserAccountTx(
          accountTx.txId,
          accountTx.userId,
          accountTx.aliasHash,
          accountTx.newSigningPubKey1,
          accountTx.newSigningPubKey2,
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
        publicOwner: EthAddress.randomAddress(),
        publicValue: 20n,
        txRefNo,
      });
      expect(groupUserTxs([accountTx, depositAndFeeTx], feePayingAssetIds)).toEqual([
        new UserAccountTx(
          accountTx.txId,
          accountTx.userId,
          accountTx.aliasHash,
          accountTx.newSigningPubKey1,
          accountTx.newSigningPubKey2,
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
      expect(groupUserTxs([accountTx, feeTx], feePayingAssetIds)).toEqual([
        new UserAccountTx(
          accountTx.txId,
          accountTx.userId,
          accountTx.aliasHash,
          accountTx.newSigningPubKey1,
          accountTx.newSigningPubKey2,
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
        publicOwner: EthAddress.randomAddress(),
        publicValue: 100n,
        senderPrivateOutput: 80n,
      });
      expect(groupUserTxs([depositTx], feePayingAssetIds)).toEqual([
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
        publicOwner: EthAddress.randomAddress(),
        assetId: garbageAssetId,
        publicValue: 80n,
        senderPrivateOutput: 80n,
        txRefNo,
      });
      const feeTx = createFeeTx(20n, txRefNo);
      expect(groupUserTxs([depositTx, feeTx], feePayingAssetIds)).toEqual([
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
        publicOwner: EthAddress.randomAddress(),
        publicValue: 100n,
        recipientPrivateOutput: 80n,
        isRecipient: false,
      });
      expect(groupUserTxs([depositTx], feePayingAssetIds)).toEqual([
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
        publicOwner: EthAddress.randomAddress(),
        publicValue: 100n,
        isRecipient: false,
      });
      expect(groupUserTxs([depositTx], feePayingAssetIds)).toEqual([
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
        publicOwner: EthAddress.randomAddress(),
        publicValue: 100n,
        recipientPrivateOutput: 80n,
        isRecipient: true,
        isSender: false,
      });
      expect(groupUserTxs([depositTx], feePayingAssetIds)).toEqual([
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
        publicOwner: EthAddress.randomAddress(),
        publicValue: 80n,
        privateInput: 100n,
      });
      expect(groupUserTxs([withdrawTx], feePayingAssetIds)).toEqual([
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
        publicOwner: EthAddress.randomAddress(),
        assetId: garbageAssetId,
        publicValue: 80n,
        privateInput: 80n,
        txRefNo,
      });
      const feeTx = createFeeTx(20n, txRefNo);
      expect(groupUserTxs([withdrawTx, feeTx], feePayingAssetIds)).toEqual([
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
      expect(groupUserTxs([sendTx], feePayingAssetIds)).toEqual([
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
      expect(groupUserTxs([sendTx], feePayingAssetIds)).toEqual([
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
      expect(groupUserTxs([sendTx], feePayingAssetIds)).toEqual([
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
      expect(groupUserTxs([sendTx], feePayingAssetIds)).toEqual([
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
      expect(groupUserTxs([sendTx], feePayingAssetIds)).toEqual([
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
      expect(groupUserTxs([sendTx, feeTx], feePayingAssetIds)).toEqual([
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
      expect(groupUserTxs([defiTx], feePayingAssetIds)).toEqual([
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
            isAsync: false,
            interactionNonce: 0,
            success: false,
            outputValueA: 0n,
            outputValueB: 0n,
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
      expect(groupUserTxs([defiTx], feePayingAssetIds)).toEqual([
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
            outputValueA: 123n,
            outputValueB: 0n,
            claimSettled: undefined,
            finalised: undefined,
          },
        ),
      ]);
    });

    it('recover finalised defi tx', () => {
      const defiTx = randomCoreDefiTx({
        bridgeId,
        success: true,
        outputValueA: 23n,
        outputValueB: 45n,
        interactionNonce: 678,
        isAsync: true,
        settled: new Date(),
        finalised: new Date(),
      });
      expect(groupUserTxs([defiTx], feePayingAssetIds)).toEqual([
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
            outputValueA: 23n,
            outputValueB: 45n,
            claimSettled: undefined,
            finalised: defiTx.finalised,
          },
        ),
      ]);
    });

    it('recover settled defi tx and claim tx', () => {
      const claimTxId = TxId.random();
      const defiTx = randomCoreDefiTx({
        bridgeId,
        success: true,
        outputValueA: 23n,
        outputValueB: 45n,
        interactionNonce: 678,
        isAsync: true,
        settled: new Date(),
        finalised: new Date(),
        claimSettled: new Date(),
        claimTxId,
      });
      expect(groupUserTxs([defiTx], feePayingAssetIds)).toEqual([
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
            outputValueA: 23n,
            outputValueB: 45n,
            claimSettled: defiTx.claimSettled,
            finalised: defiTx.finalised,
          },
        ),
        new UserDefiClaimTx(
          claimTxId,
          defiTx.userId,
          bridgeId,
          { assetId: 0, value: defiTx.depositValue },
          defiTx.claimSettled!,
          true,
          23n,
          45n,
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
      const defiTx = randomCoreDefiTx({ bridgeId, txFee: 20n, txRefNo });
      expect(groupUserTxs([jsTx, defiTx], feePayingAssetIds)).toEqual([
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
            isAsync: false,
            interactionNonce: 0,
            success: false,
            outputValueA: 0n,
            outputValueB: 0n,
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
      expect(groupUserTxs([defiTx, feeTx], feePayingAssetIds)).toEqual([
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
            isAsync: false,
            interactionNonce: 0,
            success: false,
            outputValueA: 0n,
            outputValueB: 0n,
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
      expect(groupUserTxs([jsTx, defiTx, feeTx], feePayingAssetIds)).toEqual([
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
            isAsync: false,
            interactionNonce: 0,
            success: false,
            outputValueA: 0n,
            outputValueB: 0n,
            claimSettled: undefined,
            finalised: undefined,
          },
        ),
      ]);
    });
  });
});
