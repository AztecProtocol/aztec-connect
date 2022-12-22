import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomBytes } from 'crypto';
import { CoreSdkInterface } from '../core_sdk/index.js';
import { DefiController } from './defi_controller.js';
import { jest } from '@jest/globals';
import { Signer } from '../signer/index.js';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

interface MockDefiProof {
  txId: TxId;
  bridgeCallData: BridgeCallData;
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
  const userSigner: Signer = {
    getPublicKey: jest.fn().mockReturnValue(GrumpkinAddress.random()),
    signMessage: jest.fn<any>().mockResolvedValue(randomBytes(32)),
  } as any;
  const defiTxId = TxId.random();
  const paymentTxId = TxId.random();

  const expectDefiInputNotes = (notes: AssetValue[]) => {
    expect(coreSdk.createDefiProofInput.mock.calls[0][3]).toEqual(notes.map(n => expect.objectContaining(n)));
    coreSdk.createDefiProofInput.mockClear();
  };

  const expectSendProofs = (proofs: (MockDefiProof | MockPaymentProof)[]) => {
    expect(coreSdk.sendProofs).toHaveBeenCalledWith(
      proofs.map(p => expect.objectContaining(p)),
      [],
      expect.objectContaining({}),
    );
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
      pickNotes: jest.fn<any>().mockResolvedValue([]),
      pickNote: jest.fn<any>().mockResolvedValue(undefined),
      createDefiProofInput: jest.fn(
        (...args): MockDefiProof => ({ txId: defiTxId, bridgeCallData: args[1], depositValue: args[2] }),
      ),
      createDefiProof: jest.fn((proofInput, txRefNo) => ({ txRefNo, ...proofInput })),
      createPaymentProofInputs: jest.fn((...args): MockPaymentProof[] => [
        {
          txId: paymentTxId,
          assetId: args[1],
          privateInput: args[4],
          outputNoteValue: args[5],
        },
      ]),
      createPaymentProof: jest.fn((proofInput, txRefNo) => ({
        txRefNo,
        ...proofInput,
        outputNotes: [
          { assetId: proofInput.assetId, value: proofInput.outputNoteValue },
          { assetId: proofInput.assetId, value: 123n }, // Random value for the change note.
        ],
      })),
      sendProofs: jest.fn(proofs => proofs.map(p => p.txId)),
    } as any;
  });

  describe('deposit one asset', () => {
    const assetId = 0;
    const bridgeCallData = new BridgeCallData(1, assetId, 3);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId, value: 1n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeCallData, depositValue, fee, coreSdk);
    });

    it('create a defi deposit proof', async () => {
      // Found 1 note that has the value of depositValue + fee.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 101n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 101n }]);
        expectSendProofs([{ txId: defiTxId, bridgeCallData, depositValue: 100n }]);
      }

      // Found 2 notes that sum to depositValue + fee.
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
        expectSendProofs([{ txId: defiTxId, bridgeCallData, depositValue: 100n }]);
      }
    });

    it('create join split proofs and a defi deposit proof', async () => {
      // Found 1 note whose value is larger than depositValue + fee.
      // Split the note to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 102n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 101n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
        ]);
      }

      // Found 2 notes whose sum is larger than depositValue + fee.
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
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
        ]);
      }

      // Found 3 notes whose sum is larger than depositValue + fee.
      // Join the notes to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 40n },
          { assetId, value: 50n },
          { assetId, value: 20n },
        ]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 101n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
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
    const bridgeCallData = new BridgeCallData(1, assetId, 3);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId: feeAssetId, value: 1n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeCallData, depositValue, fee, coreSdk);
    });

    it('create a defi deposit proof and a fee paying proof', async () => {
      // Found 1 note that has the value of depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 100n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 100n }]);
        expectSendProofs([
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Found 2 notes that sum to depositValue.
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
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }
    });

    it('create join split proofs, a defi deposit proof and a fee paying proof', async () => {
      // Found 1 note whose value is larger than depositValue.
      // Split the note to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [{ assetId, value: 101n }]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 100n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Found 2 notes whose sum is larger than depositValue.
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
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Found 3 notes whose sum is equal to depositValue.
      // Join the notes to create an exact value note.
      {
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId, value: 40n },
          { assetId, value: 50n },
          { assetId, value: 10n },
        ]);

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([{ assetId, value: 100n }]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }
    });
  });

  describe('deposit two assets', () => {
    const assetId = 0;
    const secondAssetId = 2;
    const bridgeCallData = new BridgeCallData(1, assetId, 3, secondAssetId);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId, value: 1n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeCallData, depositValue, fee, coreSdk);
    });

    it('create a defi deposit proof', async () => {
      // Input asset A: Found 1 note that has the value of depositValue + fee.
      // Input asset B: Found 1 note that has the value of depositValue.
      {
        coreSdk.pickNote.mockImplementation((_, assetId) => ({
          assetId,
          value: assetId === secondAssetId ? 100n : 101n,
        }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([{ txId: defiTxId, bridgeCallData, depositValue: 100n }]);
      }
    });

    it('create join split proofs and a defi deposit proof', async () => {
      // Input asset A: Found 1 note whose value is larger than depositValue + fee.
      // Input asset B: Found 1 note that has the value of depositValue.
      {
        coreSdk.pickNote.mockImplementation((_, assetId) => ({
          assetId,
          value: assetId === secondAssetId ? 100n : 102n,
        }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
        ]);
      }

      // Input asset A: Found 2 notes that sum to depositValue + fee.
      // Input asset B: Found 1 note that has the value of depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
          assetId === secondAssetId
            ? []
            : [
                { assetId, value: 40n },
                { assetId, value: 61n },
              ],
        );
        coreSdk.pickNote.mockImplementation((_, assetId) =>
          assetId === secondAssetId
            ? {
                assetId,
                value: 100n,
              }
            : undefined,
        );

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
        ]);
      }

      // Input asset A: Found 2 notes whose sum is larger than depositValue + fee.
      // Input asset B: Found 1 note that has the value of depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
          assetId === secondAssetId
            ? []
            : [
                { assetId, value: 40n },
                { assetId, value: 62n },
              ],
        );
        coreSdk.pickNote.mockImplementation((_, assetId) =>
          assetId === secondAssetId
            ? {
                assetId,
                value: 100n,
              }
            : undefined,
        );

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
        ]);
      }

      // Input asset A: Found 3 notes whose sum is equal to depositValue + fee.
      // Input asset B: Found 1 note that has the value of depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
          assetId === secondAssetId
            ? []
            : [
                { assetId, value: 40n },
                { assetId, value: 50n },
                { assetId, value: 10n },
              ],
        );
        coreSdk.pickNote.mockImplementation((_, assetId) =>
          assetId === secondAssetId
            ? {
                assetId,
                value: 100n,
              }
            : undefined,
        );

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
        ]);
      }
    });

    it('create join split proofs for the second asset and a defi deposit proof', async () => {
      // Input asset A: Found 1 note that has the value of depositValue + fee.
      // Input asset B: Found 1 note whose value is larger than depositValue.
      {
        coreSdk.pickNote.mockImplementation((_, assetId) => ({
          assetId,
          value: 101n,
        }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId: secondAssetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
        ]);
      }

      // Input asset A: Found 1 note that has the value of depositValue + fee.
      // Input asset B: Found 2 notes whose sum is larger than depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
          assetId === secondAssetId
            ? [
                { assetId: secondAssetId, value: 41n },
                { assetId: secondAssetId, value: 60n },
              ]
            : [],
        );
        coreSdk.pickNote.mockImplementation((_, assetId) =>
          assetId === secondAssetId
            ? undefined
            : {
                assetId,
                value: 101n,
              },
        );

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId: secondAssetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
        ]);
      }

      // Input asset A: Found 1 note that has the value of depositValue + fee.
      // Input asset B: Found 3 notes whose sum is equal to depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
          assetId === secondAssetId
            ? [
                { assetId: secondAssetId, value: 40n },
                { assetId: secondAssetId, value: 50n },
                { assetId: secondAssetId, value: 10n },
              ]
            : [],
        );
        coreSdk.pickNote.mockImplementation((_, assetId) =>
          assetId === secondAssetId
            ? undefined
            : {
                assetId,
                value: 101n,
              },
        );

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId: secondAssetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
        ]);
      }
    });

    it('exclude pending notes for the first asset if there is a pending note for the second asset', async () => {
      // Input asset A: Found 1 note that has the value larger than depositValue + fee.
      // Input asset B: Found 1 pending note whose value is equal to depositValue.
      {
        coreSdk.pickNote.mockImplementation((_, assetId, ...rest) => {
          if (assetId === secondAssetId) {
            return {
              assetId,
              value: 100n,
              pending: true,
            };
          }
          const excludePendingNotes = rest[2];
          return {
            assetId,
            value: excludePendingNotes ? 102n : 101n,
          };
        });

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 101n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 101n, outputNoteValue: 101n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
        ]);
      }
    });

    it('throw if cannot find a note for the first asset', async () => {
      coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
        assetId === secondAssetId
          ? [
              { assetId, value: 40n },
              { assetId, value: 60n },
            ]
          : [],
      );
      coreSdk.pickNote.mockImplementation((_, assetId) =>
        assetId === secondAssetId
          ? {
              assetId,
              value: 100n,
            }
          : undefined,
      );

      coreSdk.pickNotes.mockImplementationOnce(() => []);
      coreSdk.pickNote.mockImplementationOnce(() => undefined);

      await expect(controller.createProof()).rejects.toThrow();
    });

    it('throw if cannot find a note for the second asset', async () => {
      coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
        assetId === secondAssetId
          ? []
          : [
              { assetId, value: 40n },
              { assetId, value: 60n },
            ],
      );
      coreSdk.pickNote.mockImplementation((_, assetId) =>
        assetId === secondAssetId
          ? undefined
          : {
              assetId,
              value: 100n,
            },
      );
      coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 101n }));
      coreSdk.pickNote.mockImplementationOnce(() => undefined);

      await expect(controller.createProof()).rejects.toThrow();
    });

    it('throw if cannot find the exact value note for both assets', async () => {
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId, value) => [{ assetId, value: value + 1n }]);
        coreSdk.pickNote.mockImplementation((_, assetId, value) => ({ assetId, value: value + 1n }));
        await expect(controller.createProof()).rejects.toThrow();
      }

      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId, value) => [
          { assetId, value: 10n },
          { assetId, value: value - 10n },
        ]);
        coreSdk.pickNote.mockImplementation(() => undefined);

        coreSdk.pickNote.mockImplementationOnce(() => ({ assetId, value: 102n }));
        coreSdk.pickNotes.mockImplementationOnce(() => [
          { assetId: secondAssetId, value: 40n },
          { assetId: secondAssetId, value: 60n },
        ]);
        await expect(controller.createProof()).rejects.toThrow();
      }

      {
        coreSdk.pickNotes.mockImplementationOnce(() => []);
        coreSdk.pickNote.mockImplementation((_, assetId, value) => ({ assetId, value: value + 1n }));
        await expect(controller.createProof()).rejects.toThrow();
      }
    });
  });

  describe('deposit two non fee paying assets', () => {
    const assetId = 0;
    const secondAssetId = 2;
    const feeAssetId = 4;
    const bridgeCallData = new BridgeCallData(1, assetId, 3, secondAssetId);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId: feeAssetId, value: 1n };
    let controller: DefiController;

    beforeEach(() => {
      controller = new DefiController(userId, userSigner, bridgeCallData, depositValue, fee, coreSdk);
    });

    it('create a defi deposit proof and a fee paying proof', async () => {
      // Input asset A: Found 1 note that has the value of depositValue.
      // Input asset B: Found 1 note that has the value of depositValue.
      coreSdk.pickNote.mockImplementation((_, assetId) => ({ assetId, value: 100n }));

      await controller.createProof();
      await controller.send();

      expectDefiInputNotes([
        { assetId, value: 100n },
        { assetId: secondAssetId, value: 100n },
      ]);
      expectSendProofs([
        { txId: defiTxId, bridgeCallData, depositValue: 100n },
        { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
      ]);
    });

    it('create join split proofs, a defi deposit proof and a fee paying proof', async () => {
      // Input asset A: Found 1 note whose value is larger than depositValue.
      // Input asset B: Found 1 note that has the value of depositValue.
      {
        coreSdk.pickNote.mockImplementation((_, assetId) => ({
          assetId,
          value: assetId === secondAssetId ? 100n : 101n,
        }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Input asset A: Found 2 notes that sum to depositValue.
      // Input asset B: Found 1 note that has the value of depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
          assetId === secondAssetId
            ? []
            : [
                { assetId, value: 40n },
                { assetId, value: 60n },
              ],
        );
        coreSdk.pickNote.mockImplementation((_, assetId) =>
          assetId === secondAssetId
            ? {
                assetId,
                value: 100n,
              }
            : undefined,
        );

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Input asset A: Found 2 notes whose sum is larger than depositValue.
      // Input asset B: Found 1 note that has the value of depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
          assetId === secondAssetId
            ? []
            : [
                { assetId, value: 40n },
                { assetId, value: 61n },
              ],
        );
        coreSdk.pickNote.mockImplementation((_, assetId) =>
          assetId === secondAssetId
            ? {
                assetId,
                value: 100n,
              }
            : undefined,
        );

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Input asset A: Found 3 notes whose sum is larger than depositValue.
      // Input asset B: Found 1 note that has the value of depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
          assetId === secondAssetId
            ? []
            : [
                { assetId, value: 41n },
                { assetId, value: 50n },
                { assetId, value: 10n },
              ],
        );
        coreSdk.pickNote.mockImplementation((_, assetId) =>
          assetId === secondAssetId
            ? {
                assetId,
                value: 100n,
              }
            : undefined,
        );

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }
    });

    it('create join split proofs for the second asset, a defi deposit proof and a fee paying proof', async () => {
      // Input asset A: Found 1 note that has the value of depositValue.
      // Input asset B: Found 1 note whose value is larger than depositValue.
      {
        coreSdk.pickNote.mockImplementation((_, assetId) => ({
          assetId,
          value: assetId === secondAssetId ? 101n : 100n,
        }));

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId: secondAssetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Input asset A: Found 1 note that has the value of depositValue.
      // Input asset B: Found 2 notes whose sum is larger than depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
          assetId === secondAssetId
            ? [
                { assetId, value: 40n },
                { assetId, value: 61n },
              ]
            : [],
        );
        coreSdk.pickNote.mockImplementation((_, assetId) =>
          assetId === secondAssetId
            ? undefined
            : {
                assetId,
                value: 100n,
              },
        );

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId: secondAssetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }

      // Input asset A: Found 1 note that has the value of depositValue.
      // Input asset B: Found 3 notes whose sum is equal to depositValue.
      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId) =>
          assetId === secondAssetId
            ? [
                { assetId: secondAssetId, value: 40n },
                { assetId: secondAssetId, value: 50n },
                { assetId: secondAssetId, value: 10n },
              ]
            : [
                { assetId, value: 40n },
                { assetId, value: 61n },
              ],
        );
        coreSdk.pickNote.mockImplementation((_, assetId) =>
          assetId === secondAssetId
            ? undefined
            : {
                assetId,
                value: 100n,
              },
        );

        await controller.createProof();
        await controller.send();

        expectDefiInputNotes([
          { assetId, value: 100n },
          { assetId: secondAssetId, value: 100n },
        ]);
        expectSendProofs([
          { txId: paymentTxId, assetId: secondAssetId, privateInput: 100n, outputNoteValue: 100n },
          { txId: defiTxId, bridgeCallData, depositValue: 100n },
          { txId: paymentTxId, assetId: feeAssetId, privateInput: 1n, outputNoteValue: 0n },
        ]);
      }
    });

    it('throw if cannot find the exact value note for both assets', async () => {
      {
        coreSdk.pickNotes.mockImplementationOnce(() => []);
        coreSdk.pickNote.mockImplementation((_, assetId, value) => ({ assetId, value: value + 1n }));
        await expect(controller.createProof()).rejects.toThrow();
      }

      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId, value) => [{ assetId, value: value + 1n }]);
        coreSdk.pickNote.mockImplementation(() => undefined);
        await expect(controller.createProof()).rejects.toThrow();
      }

      {
        coreSdk.pickNotes.mockImplementationOnce((_, assetId, value) => [
          { assetId, value: 10n },
          { assetId, value: value - 10n },
        ]);
        coreSdk.pickNote.mockImplementation(() => undefined);
        await expect(controller.createProof()).rejects.toThrow();
      }
    });
  });

  describe('cannot be created from invalid args', () => {
    const assetId = 0;
    const bridgeCallData = new BridgeCallData(1, assetId, 3, 4, 5);
    const depositValue = { assetId, value: 100n };
    const fee = { assetId, value: 1n };

    it('bridge id cannot have identical input assets', () => {
      const invalidBridgeCallData = new BridgeCallData(0, assetId, 3, assetId);
      expect(() => new DefiController(userId, userSigner, invalidBridgeCallData, depositValue, fee, coreSdk)).toThrow(
        'Identical input assets.',
      );
    });

    it('bridge id cannot have identical output assets', () => {
      const invalidBridgeCallData = new BridgeCallData(0, assetId, 2, undefined, 2);
      expect(() => new DefiController(userId, userSigner, invalidBridgeCallData, depositValue, fee, coreSdk)).toThrow(
        'Identical output assets.',
      );
    });

    it('deposit value cannot be 0', () => {
      const invalidDepositValue = { assetId, value: 0n };
      expect(() => new DefiController(userId, userSigner, bridgeCallData, invalidDepositValue, fee, coreSdk)).toThrow(
        'Deposit value must be greater than 0.',
      );
    });

    it('asset of deposit value must be the same as the input asset', () => {
      {
        const invalidDepositValue = { assetId: assetId + 1, value: 100n };
        expect(() => new DefiController(userId, userSigner, bridgeCallData, invalidDepositValue, fee, coreSdk)).toThrow(
          'Incorrect deposit asset.',
        );
      }
      {
        const twoAssetBridgeCallData = new BridgeCallData(1, assetId, 0, assetId + 1);
        const invalidDepositValue = { assetId: assetId + 2, value: 100n };
        expect(
          () => new DefiController(userId, userSigner, twoAssetBridgeCallData, invalidDepositValue, fee, coreSdk),
        ).toThrow('Incorrect deposit asset.');
      }
    });

    it('fee cannot be paid with second input asset', () => {
      const invalidFee = { assetId: bridgeCallData.inputAssetIdB!, value: 1n };
      expect(() => new DefiController(userId, userSigner, bridgeCallData, depositValue, invalidFee, coreSdk)).toThrow(
        'Fee paying asset must be the first input asset.',
      );
    });
  });
});
