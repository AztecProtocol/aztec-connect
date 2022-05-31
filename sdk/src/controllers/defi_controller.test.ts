import { GrumpkinAddress } from '@aztec/barretenberg/address';
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
  const userId = GrumpkinAddress.random();
  const userSigner = {
    getPublicKey: jest.fn().mockReturnValue(GrumpkinAddress.random()),
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
    const bridgeId = new BridgeId(1, assetId, 3);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId, value: 1n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeId, depositValue, fee, coreSdk);
    });

    it('create a defi deposit proof', async () => {
      // Found two notes that sum to depositValue + fee.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 40n },
          { assetId, value: 61n },
        ]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 40n },
          { assetId, value: 61n },
        ]);
        expectSendProofs([{ txId: defiTxId, bridgeId, depositValue: 100n }]);
      }

      // Found one note that has the value of depositValue + fee.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 101n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 101n }]);
        expectSendProofs([{ txId: defiTxId, bridgeId, depositValue: 100n }]);
      }
    });

    it('create a join split proof and a defi deposit proof', async () => {
      // Found two notes whose sum is larger than depositValue + fee.
      // Join the notes to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 41n },
          { assetId, value: 61n },
        ]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 101n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }

      // Found a note whose value is larger than depositValue + fee.
      // Split the note to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 102n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 101n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }
    });

    it('throw if cannot find any input notes', async () => {
      await expect(controller.createProof()).rejects.toThrow();
    });
  });

  describe('deposit one non fee paying asset', () => {
    const assetId = 0;
    const feeAssetId = 2;
    const bridgeId = new BridgeId(1, assetId, 3);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId: feeAssetId, value: 1n };
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
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
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
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }
    });

    it('create a join split proof, a defi deposit proof and a fee paying proof', async () => {
      // Found two notes whose sum is larger than depositValue.
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
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Found a note whose value is larger than depositValue.
      // Split the note to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 101n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 100n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }
    });
  });

  describe('deposit two assets', () => {
    const assetId = 0;
    const secondAssetId = 2;
    const bridgeId = new BridgeId(1, assetId, 3, secondAssetId);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId, value: 1n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeId, depositValue, fee, coreSdk);
    });

    it('create a defi deposit proof', async () => {
      // Input asset A: Found one note that has the value of depositValue + fee.
      // Input asset B: Found one note that has the value of depositValue.
      {
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 101n }));
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([{ txId: defiTxId, bridgeId, depositValue: 100n }]);
      }
    });

    it('create a join split proof and a defi deposit proof', async () => {
      // Input asset A: Found two notes that sum to depositValue + fee.
      // Input asset B: Found one note that has the value of depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 40n },
          { assetId, value: 61n },
        ]);
        coreSdk.pickNote.mockImplementationOnce(() => undefined);
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }

      // Input asset A: Found two notes whose sum is larger than depositValue + fee.
      // Input asset B: Found one note that has the value of depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 40n },
          { assetId, value: 62n },
        ]);
        coreSdk.pickNote.mockImplementationOnce(() => undefined);
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }

      // Input asset A: Found one note whose value is larger than depositValue + fee.
      // Input asset B: Found one note that has the value of depositValue.
      {
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 102n }));
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 100n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }
    });

    it('create a join split proof for the second asset and a defi deposit proof', async () => {
      // Input asset A: Found one note that has the value of depositValue + fee.
      // Input asset B: Found one note whose value is larger than depositValue.
      {
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 101n }));
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 101n }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId: secondAssetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }

      // Input asset A: Found one note that has the value of depositValue + fee.
      // Input asset B: Found two notes whose sum is larger than depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId: secondAssetId, value: 41n },
          { assetId: secondAssetId, value: 60n },
        ]);
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 101n }));
        coreSdk.pickNote.mockImplementationOnce(() => undefined);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId: secondAssetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
        ]);
      }
    });

    it('throw if cannot find a note for the first asset', async () => {
      coreSdk.pickNotes.mockImplementationOnce(() => []);
      coreSdk.pickNote.mockImplementationOnce(() => undefined);

      await expect(controller.createProof()).rejects.toThrow();
    });

    it('throw if cannot find a note for the second asset', async () => {
      coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 101n }));
      coreSdk.pickNote.mockImplementationOnce(() => undefined);

      await expect(controller.createProof()).rejects.toThrow();
    });

    it('throw if cannot find the exact value note for both assets', async () => {
      {
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 102n }));
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 101n }));
        await expect(controller.createProof()).rejects.toThrow();
      }

      {
        coreSdk.pickNote.mockReset();
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 102n }));
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId: secondAssetId, value: 40n },
          { assetId: secondAssetId, value: 60n },
        ]);
        await expect(controller.createProof()).rejects.toThrow();
      }

      {
        coreSdk.pickNotes.mockReset();
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 41n },
          { assetId, value: 60n },
        ]);
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId: secondAssetId, value: 40n },
          { assetId: secondAssetId, value: 60n },
        ]);
        await expect(controller.createProof()).rejects.toThrow();
      }
    });
  });

  describe('deposit two non fee paying assets', () => {
    const assetId = 0;
    const secondAssetId = 2;
    const feeAssetId = 4;
    const bridgeId = new BridgeId(1, assetId, 3, secondAssetId);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId: feeAssetId, value: 1n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeId, depositValue, fee, coreSdk);
    });

    it('create a defi deposit proof and a fee paying proof', async () => {
      // Input asset A: Found one note that has the value of depositValue.
      // Input asset B: Found one note that has the value of depositValue.
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
        { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
      ]);
    });

    it('create a join split proof, a defi deposit proof and a fee paying proof', async () => {
      // Input asset A: Found two notes that sum to depositValue.
      // Input asset B: Found one note that has the value of depositValue.
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
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Input asset A: Found two notes whose sum is larger than depositValue.
      // Input asset B: Found one note that has the value of depositValue.
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
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Input asset A: Found one note whose value is larger than depositValue.
      // Input asset B: Found one note that has the value of depositValue.
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
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }
    });

    it('create a join split proof for the second asset, a defi deposit proof and a fee paying proof', async () => {
      // Input asset A: Found one note that has the value of depositValue.
      // Input asset B: Found one note whose value is larger than depositValue.
      {
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 100n }));
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
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Input asset A: Found one note that has the value of depositValue.
      // Input asset B: Found two notes whose sum is larger than depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId: secondAssetId, value: 41n },
          { assetId: secondAssetId, value: 60n },
        ]);
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 100n }));
        coreSdk.pickNote.mockImplementationOnce(() => undefined);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId: secondAssetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeId, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }
    });

    it('throw if cannot find the exact value note for both assets', async () => {
      {
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 101n }));
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId: secondAssetId, value: 101n }));
        await expect(controller.createProof()).rejects.toThrow();
      }

      {
        coreSdk.pickNote.mockReset();
        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 101n }));
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId: secondAssetId, value: 40n },
          { assetId: secondAssetId, value: 60n },
        ]);
        await expect(controller.createProof()).rejects.toThrow();
      }

      {
        coreSdk.pickNotes.mockReset();
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 40n },
          { assetId, value: 60n },
        ]);
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId: secondAssetId, value: 40n },
          { assetId: secondAssetId, value: 60n },
        ]);
        await expect(controller.createProof()).rejects.toThrow();
      }
    });
  });

  describe('cannot be created from invalid args', () => {
    const assetId = 0;
    const bridgeId = new BridgeId(1, assetId, 3, 4, 5);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId, value: 1n };

    it('bridge id cannot have identical input assets', () => {
      const invalidBridgeId = new BridgeId(0, assetId, 3, assetId);
      expect(() => new DefiController(userId, userSigner, invalidBridgeId, depositValue, fee, coreSdk)).toThrow(
        'Identical input assets.',
      );
    });

    it('bridge id cannot have identical output assets', () => {
      const invalidBridgeId = new BridgeId(0, assetId, 2, undefined, 2);
      expect(() => new DefiController(userId, userSigner, invalidBridgeId, depositValue, fee, coreSdk)).toThrow(
        'Identical output assets.',
      );
    });

    it('deposit value cannot be 0', () => {
      const invalidDepositValue = { assetId, value: 0n };
      expect(() => new DefiController(userId, userSigner, bridgeId, invalidDepositValue, fee, coreSdk)).toThrow(
        'Deposit value must be greater than 0.',
      );
    });

    it('asset of deposit value must be the same as the first input asset', () => {
      const invalidDepositValue = { assetId: assetId + 1, value: 100n };
      expect(() => new DefiController(userId, userSigner, bridgeId, invalidDepositValue, fee, coreSdk)).toThrow(
        'Incorrect deposit asset.',
      );
    });

    it('fee cannot be paid with second input asset', () => {
      const invalidFee = { assetId: bridgeId.inputAssetIdB!, value: 0n };
      expect(() => new DefiController(userId, userSigner, bridgeId, depositValue, invalidFee, coreSdk)).toThrow(
        'Fee paying asset must be the first input asset.',
      );
    });

    it('cannot use unsafe notes for defi deposit', () => {
      userSigner.getPublicKey.mockReturnValue(userId);
      expect(() => new DefiController(userId, userSigner, bridgeId, depositValue, fee, coreSdk)).toThrow(
        'Defi deposit not available for non registered user.',
      );
    });
  });
});
