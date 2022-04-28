import { AccountId } from '@aztec/barretenberg/account_id';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomBytes } from 'crypto';
import { CoreSdkInterface } from '../core_sdk';
import { DefiController } from './defi_controller';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

interface MockDefiProof {
  txId: TxId;
  bridgeId: BridgeId;
  depositValue: bigint;
}

interface MockPaymentProof {
  txId: TxId;
  assetId: number;
  privateInput: bigint;
  outputNoteValue: bigint;
}

describe('defi controller', () => {
  let coreSdk: Mockify<CoreSdkInterface>;
  const userId = AccountId.random();
  const userSigner = {
    getPublicKey: jest.fn().mockReturnValue(userId.publicKey),
    signMessage: jest.fn().mockResolvedValue(randomBytes(32)),
  };
  const defiTxId = TxId.random();
  const paymentTxId = TxId.random();

  const expectDefiInputNotes = (notes: AssetValue[]) => {
    expect(coreSdk.createDefiProofInput.mock.calls[0][3]).toEqual(notes.map(n => expect.objectContaining(n)));
    coreSdk.createDefiProofInput.mockClear();
  };

  const expectSendProofs = (proofs: (MockDefiProof | MockPaymentProof)[]) => {
    expect(coreSdk.sendProofs).toHaveBeenCalledWith(proofs.map(p => expect.objectContaining(p)));
    const txRefNos = coreSdk.sendProofs.mock.calls[0][0].map(({ txRefNo }) => txRefNo);
    const [txRefNo] = txRefNos;
    if (proofs.length === 1) {
      expect(txRefNo).toBe(0);
    } else {
      expect(txRefNo).toBeGreaterThan(0);
      expect(txRefNos).toEqual(Array(proofs.length).fill(txRefNo));
    }
    coreSdk.sendProofs.mockClear();
  };

  beforeEach(() => {
    coreSdk = {
      pickNotes: jest.fn().mockResolvedValue([]),
      pickNote: jest.fn().mockResolvedValue(undefined),
      createDefiProofInput: jest
        .fn()
        .mockImplementation((...args): MockDefiProof => ({ txId: defiTxId, bridgeId: args[1], depositValue: args[2] })),
      createDefiProof: jest.fn().mockImplementation((proofInput, txRefNo) => ({ txRefNo, ...proofInput })),
      createPaymentProofInput: jest.fn().mockImplementation(
        (...args): MockPaymentProof => ({
          txId: paymentTxId,
          assetId: args[1],
          privateInput: args[4],
          outputNoteValue: args[5],
        }),
      ),
      createPaymentProof: jest.fn().mockImplementation((proofInput, txRefNo) => ({
        txRefNo,
        ...proofInput,
        outputNotes: [{ assetId: proofInput.assetId, value: proofInput.outputNoteValue }],
      })),
      sendProofs: jest.fn().mockImplementation(proofs => proofs.map(p => p.txId)),
    } as any;
  });

  describe('deposit one asset', () => {
    const assetId = 0;
    const outputAssetId = 1;
    const bridgeId = new BridgeId(1, assetId, outputAssetId);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId, value: 2n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeId, depositValue, fee, coreSdk);
    });

    it('create a defi deposit proof', async () => {
      // Found two notes that sum to depositValue + fee.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 40n },
          { assetId, value: 62n },
        ]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 40n },
          { assetId, value: 62n },
        ]);
        expectSendProofs([{ txId: defiTxId, bridgeId, depositValue: 100n }]);
      }

      // Found one note that has the value of depositValue + fee.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 102n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 102n }]);
        expectSendProofs([{ txId: defiTxId, bridgeId, depositValue: 100n }]);
      }
    });

    it('create a join split proof and a defi deposit proof', async () => {
      // Found two notes whose sum is more than depositValue + fee.
      // Join the notes to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 41n },
          { assetId, value: 62n },
        ]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 102n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 102n, outputNoteValue: 102n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }

      // Found a note whose value is more than depositValue + fee.
      // Split the note to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 103n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 102n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 102n, outputNoteValue: 102n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }
    });

    it('throw if can not find any input notes', async () => {
      await expect(controller.createProof()).rejects.toThrow();
    });
  });

  describe('deposit one non fee paying asset', () => {
    const assetId = 0;
    const outputAssetId = 1;
    const feeAssetId = 2;
    const bridgeId = new BridgeId(1, assetId, outputAssetId);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId: feeAssetId, value: 2n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeId, depositValue, fee, coreSdk);
    });

    it('create a defi deposit proof and a fee paying proof', async () => {
      // Found two notes that sum to depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 40n },
          { assetId, value: 60n },
        ]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 40n },
          { assetId, value: 60n },
        ]);
        expectSendProofs([
          { txId: defiTxId, bridgeId, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 2n, outputNoteValue: 0n },
        ]);
      }

      // Found one note that has the value of depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 100n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 100n }]);
        expectSendProofs([
          { txId: defiTxId, bridgeId, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 2n, outputNoteValue: 0n },
        ]);
      }
    });

    it('create a join split proof, a defi deposit proof and a fee paying proof', async () => {
      // Found two notes whose sum is more than depositValue.
      // Join the notes to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 41n },
          { assetId, value: 60n },
        ]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 100n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 2n, outputNoteValue: 0n },
        ]);
      }

      // Found a note whose value is more than depositValue.
      // Split the note to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 101n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 100n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 2n, outputNoteValue: 0n },
        ]);
      }
    });
  });

  describe('deposit two assets', () => {
    const assetId = 0;
    const secondAssetId = 2;
    const outputAssetId = 1;
    const bridgeId = new BridgeId(1, assetId, outputAssetId, secondAssetId);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId, value: 2n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeId, depositValue, fee, coreSdk);
    });

    it('create a join split proof and a defi deposit proof', async () => {
      // Found two notes that sum to depositValue + fee.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ value: 40n }, { value: 62n }]);
        coreSdk.pickNote.mockImplementationOnce(() => undefined);
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 102n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }

      // Found one note that has the value of depositValue + fee.
      {
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 102n }));
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 102n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }
    });

    it('create a join split proof with change value and a defi deposit proof', async () => {
      // Found two notes whose sum is more than the depositValue.
      // Join the notes to create an exact value note and pay the fee.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ value: 41n }, { value: 62n }]);
        coreSdk.pickNote.mockImplementationOnce(() => undefined);
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 102n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }

      // Found a note whose value is more than the depositValue.
      // Split the note to create an exact value note and pay the fee.
      {
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 112n }));
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 102n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }
    });

    it('throw if can not find a second note with exact value', async () => {
      coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 112n }));
      coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 101n }));

      await expect(controller.createProof()).rejects.toThrow();
    });
  });

  describe('deposit two non fee paying assets', () => {
    const assetId = 0;
    const secondAssetId = 2;
    const feeAssetId = 3;
    const outputAssetId = 1;
    const bridgeId = new BridgeId(1, assetId, outputAssetId, secondAssetId);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId: feeAssetId, value: 2n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeId, depositValue, fee, coreSdk);
    });

    it('create a defi deposit proof and a fee paying proof', async () => {
      // Found one note that has the value of depositValue.
      coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 100n }));
      coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

      await controller.createProof();
      await controller.send();

      expectDefiInputNotes([
        { assetId, value: 100n },
        { assetId: secondAssetId, value: 100n },
      ]);
      expectSendProofs([
        { txId: defiTxId, bridgeId, depositValue: 100n },
        { txId: paymentTxId, assetId: feeAssetId, privateInput: 2n, outputNoteValue: 0n },
      ]);
    });

    it('create a join split proof, a defi deposit proof and a fee paying proof', async () => {
      // Found two notes that sum to depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 40n },
          { assetId, value: 60n },
        ]);
        coreSdk.pickNote.mockImplementationOnce(() => undefined);
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 2n, outputNoteValue: 0n },
        ]);
      }

      // Found two notes whose sum is more than the depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 41n },
          { assetId, value: 60n },
        ]);
        coreSdk.pickNote.mockImplementationOnce(() => undefined);
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 2n, outputNoteValue: 0n },
        ]);
      }

      // Found one note whose value is more than the depositValue.
      {
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 101n }));
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 2n, outputNoteValue: 0n },
        ]);
      }
    });

    it('create a join split proof for the second asset, a defi deposit proof and a fee paying proof', async () => {
      coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 100n }));
      // Found one note whose value is more than the depositValue.
      coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 101n }));

      await controller.createProof();
      await controller.send();

      expectDefiInputNotes([
        { assetId, value: 100n },
        { assetId: secondAssetId, value: 100n },
      ]);
      expectSendProofs([
        { txId: paymentTxId, assetId: secondAssetId, privateInput: 100n, outputNoteValue: 100n },
        { txId: defiTxId, bridgeId, depositValue: 100n },
        { txId: paymentTxId, assetId: feeAssetId, privateInput: 2n, outputNoteValue: 0n },
      ]);
    });

    it('throw if can not find the exact value note for both assets', async () => {
      coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 101n }));
      coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 101n }));

      await expect(controller.createProof()).rejects.toThrow();
    });
  });
});
