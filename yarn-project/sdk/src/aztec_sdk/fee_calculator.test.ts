import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdkInterface } from '../core_sdk/index.js';
import { FeeCalculator } from './fee_calcalator.js';
import { jest } from '@jest/globals';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('fee calculator', () => {
  let core: Mockify<CoreSdkInterface>;
  let blockchain: Mockify<ClientEthereumBlockchain>;
  let feeCalculator: FeeCalculator;
  const assetId = 1;
  const assetIdB = 4;
  const noneFeePayingAssetId = 2;
  const userId = GrumpkinAddress.random();

  const mockTxFees = ({
    deposit = [
      { assetId, value: 110n },
      { assetId, value: 213n },
    ],
    transfer = [
      { assetId, value: 105n },
      { assetId, value: 207n },
    ],
    withdrawToWallet = [
      { assetId, value: 106n },
      { assetId, value: 208n },
    ],
    withdrawHighGas = [
      { assetId, value: 109n },
      { assetId, value: 211n },
    ],
    account = [
      { assetId, value: 103n },
      { assetId, value: 204n },
    ],
  } = {}) => {
    core.getTxFees.mockResolvedValue([deposit, transfer, withdrawToWallet, withdrawHighGas, account]);
  };

  const mockProofData = (proofId: ProofId) =>
    Buffer.concat([numToUInt32BE(proofId, 32), Buffer.alloc((ProofData.NUM_PUBLIC_INPUTS - 1) * 32)]);

  const mockDefiProofData = (bridgeCallData: BridgeCallData) =>
    Buffer.concat([
      numToUInt32BE(ProofId.DEFI_DEPOSIT, 32),
      Buffer.alloc(10 * 32),
      bridgeCallData.toBuffer(),
      Buffer.alloc((ProofData.NUM_PUBLIC_INPUTS - 12) * 32),
    ]);

  beforeEach(() => {
    core = {
      getTxFees: jest.fn<any>().mockResolvedValue([]),
      getDefiFees: jest.fn<any>().mockResolvedValue([
        { assetId, value: 111n },
        { assetId, value: 222n },
        { assetId, value: 333n },
      ]),
      pickNote: jest.fn<any>().mockResolvedValue(undefined),
      pickNotes: jest.fn<any>().mockResolvedValue([]),
      getSpendableSum: jest.fn<any>().mockResolvedValue(0n),
    } as any;

    blockchain = {
      isContract: jest.fn<any>().mockResolvedValue(false),
      isEmpty: jest.fn<any>().mockResolvedValue(false),
    } as any;

    feeCalculator = new FeeCalculator(core, blockchain as any);

    mockTxFees();
  });

  describe('getDepositFees', () => {
    it('return fees for deposit', async () => {
      expect(await feeCalculator.getDepositFees(assetId)).toEqual([
        { assetId, value: 110n },
        { assetId, value: 213n },
      ]);

      expect(await feeCalculator.getDepositFees(assetId, { feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 110n },
        { assetId, value: 220n },
      ]);
    });

    it('return fees for depositing non fee paying asset', async () => {
      expect(await feeCalculator.getDepositFees(noneFeePayingAssetId)).toEqual([
        { assetId, value: 110n + 105n },
        { assetId, value: 213n + 105n },
      ]);

      expect(await feeCalculator.getDepositFees(noneFeePayingAssetId, { feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 220n },
        { assetId, value: 320n },
      ]);
    });
  });

  describe('getWithdrawFees', () => {
    it('return fees for withdrawal', async () => {
      expect(await feeCalculator.getWithdrawFees(assetId)).toEqual([
        { assetId, value: 109n },
        { assetId, value: 211n },
      ]);

      expect(await feeCalculator.getWithdrawFees(assetId, { feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 110n },
        { assetId, value: 220n },
      ]);
    });

    it('return fees for withdrawing non fee paying asset', async () => {
      expect(await feeCalculator.getWithdrawFees(noneFeePayingAssetId)).toEqual([
        { assetId, value: 109n + 105n },
        { assetId, value: 211n + 105n },
      ]);
    });

    it('return fees for withdrawing to wallet', async () => {
      blockchain.isContract.mockResolvedValue(false);
      blockchain.isEmpty.mockResolvedValue(false);

      const recipient = EthAddress.random();
      expect(await feeCalculator.getWithdrawFees(assetId, { recipient })).toEqual([
        { assetId, value: 106n },
        { assetId, value: 208n },
      ]);
      expect(await feeCalculator.getWithdrawFees(assetId, { recipient, feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 110n },
        { assetId, value: 210n },
      ]);
    });

    it('return fees for withdrawing to contract', async () => {
      blockchain.isContract.mockResolvedValue(true);

      const recipient = EthAddress.random();
      expect(await feeCalculator.getWithdrawFees(assetId, { recipient })).toEqual([
        { assetId, value: 109n },
        { assetId, value: 211n },
      ]);
      expect(await feeCalculator.getWithdrawFees(assetId, { recipient, feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 110n },
        { assetId, value: 220n },
      ]);
    });

    it('return fees for withdrawing to account with empty balance', async () => {
      blockchain.isEmpty.mockResolvedValue(true);

      const recipient = EthAddress.random();
      expect(await feeCalculator.getWithdrawFees(assetId, { recipient })).toEqual([
        { assetId, value: 109n },
        { assetId, value: 211n },
      ]);
      expect(await feeCalculator.getWithdrawFees(assetId, { recipient, feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 110n },
        { assetId, value: 220n },
      ]);
    });

    it('return fees for withdrawal with chained txs', async () => {
      core.getSpendableSum.mockResolvedValue(1000n);

      const mockPickNotes = (numNotes: number) => {
        core.pickNotes.mockResolvedValue(Array(numNotes).fill({}));
      };

      const options = { userId, assetValue: { assetId, value: 10n } };
      {
        mockPickNotes(1);
        expect(await feeCalculator.getWithdrawFees(assetId, options)).toEqual([
          { assetId, value: 109n },
          { assetId, value: 211n },
        ]);
      }
      {
        mockPickNotes(2);
        expect(await feeCalculator.getWithdrawFees(assetId, options)).toEqual([
          { assetId, value: 109n },
          { assetId, value: 211n },
        ]);
      }
      {
        mockPickNotes(3);
        expect(await feeCalculator.getWithdrawFees(assetId, options)).toEqual([
          { assetId, value: 109n + 105n },
          { assetId, value: 211n + 105n },
        ]);
      }
      {
        mockPickNotes(7);
        expect(await feeCalculator.getWithdrawFees(assetId, options)).toEqual([
          { assetId, value: 109n + 105n * 5n }, // 634n
          { assetId, value: 211n + 105n * 5n }, // 736n
        ]);
        expect(await feeCalculator.getWithdrawFees(assetId, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 640n },
          { assetId, value: 740n },
        ]);
      }
    });

    it('return fees for withdrawing non fee paying asset with chained txs', async () => {
      core.getSpendableSum.mockResolvedValue(1000n);

      const mockPickNotes = (numNotes: number) => {
        core.pickNotes.mockImplementation((_, assetId) => {
          if (assetId === noneFeePayingAssetId) {
            return Array(numNotes).fill({});
          } else {
            return [{}, {}];
          }
        });
      };

      const options = { userId, assetValue: { assetId: noneFeePayingAssetId, value: 10n } };
      {
        mockPickNotes(1);
        expect(await feeCalculator.getWithdrawFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 109n + 105n },
          { assetId, value: 211n + 105n },
        ]);
      }
      {
        mockPickNotes(2);
        expect(await feeCalculator.getWithdrawFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 109n + 105n },
          { assetId, value: 211n + 105n },
        ]);
      }
      {
        mockPickNotes(3);
        expect(await feeCalculator.getWithdrawFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 109n + 105n + 105n },
          { assetId, value: 211n + 105n + 105n },
        ]);
      }
      {
        // It takes 109n + 105n * 6n + 105n = 844n in total to pay the fee for withdrawal, 6 merges and 1 fee paying tx.
        mockPickNotes(8);
        expect(await feeCalculator.getWithdrawFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 109n + 105n * 6n + 105n },
          { assetId, value: 211n + 105n * 6n + 105n },
        ]);
        expect(
          await feeCalculator.getWithdrawFees(noneFeePayingAssetId, { ...options, feeSignificantFigures: 2 }),
        ).toEqual([
          { assetId, value: 850n },
          { assetId, value: 950n },
        ]);
      }
      {
        // It takes 109n + 105n + 105n + 105n * 3n = 634n in total to pay the fee for withdrawal, 1 merge, 1 transfer
        // and 4 merges for fee paying asset.
        core.pickNotes.mockImplementation((_, assetId) => {
          if (assetId === noneFeePayingAssetId) {
            return Array(3).fill({});
          } else {
            return Array(5).fill({});
          }
        });
        expect(await feeCalculator.getWithdrawFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 109n + 105n + 105n + 105n * 3n },
          { assetId, value: 211n + 105n + 105n + 105n * 3n },
        ]);
        expect(
          await feeCalculator.getWithdrawFees(noneFeePayingAssetId, { ...options, feeSignificantFigures: 2 }),
        ).toEqual([
          { assetId, value: 640n },
          { assetId, value: 740n },
        ]);
      }
    });

    it('return fees for withdrawal without enough spendable sum', async () => {
      const options = { userId, assetValue: { assetId, value: 10n } };

      const mockSpendable = (value: bigint, numNotes: number) => {
        core.getSpendableSum.mockResolvedValue(value);
        core.pickNotes.mockResolvedValue(Array(numNotes).fill({}));
      };

      {
        for (let numNotes = 0; numNotes < 2; ++numNotes) {
          // Need at least (value + fee === 10n + 109n). But the max spendable sum is only 118n.
          // The user will have to deposit or transfer a note with enough value to make the transaction.
          // After the addition of the new note, the asset's total number of notes is still less than 3.
          // No merge is required.
          mockSpendable(118n, numNotes);

          expect(await feeCalculator.getWithdrawFees(assetId, options)).toEqual([
            { assetId, value: 109n },
            { assetId, value: 211n },
          ]);
        }
      }
      {
        // Need at least (value + fee === 10n + 109n). But the max spendable sum is only 118n.
        // The user will have to deposit or transfer a note with enough value to make the transaction.
        // After the addition of the new note, the asset's total number of notes will be 3.
        // 1 merge is required.
        mockSpendable(118n, 2);

        expect(await feeCalculator.getWithdrawFees(assetId, options)).toEqual([
          { assetId, value: 109n + 105n },
          { assetId, value: 211n + 105n },
        ]);
      }
      {
        // It takes 10n + 109n + 105n * 7n = 854n in total for the withdrawan value, fee and 7 merges.
        // But the max spendable sum is only 853n.
        // 1 more merge is required.
        mockSpendable(853n, 9);

        expect(await feeCalculator.getWithdrawFees(assetId, options)).toEqual([
          { assetId, value: 109n + 105n * 7n + 105n },
          { assetId, value: 211n + 105n * 7n + 105n },
        ]);
        expect(await feeCalculator.getWithdrawFees(assetId, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 950n },
          { assetId, value: 1100n },
        ]);
      }
    });

    it('return fees for withdrawal without enough spendable sum for fee paying asset', async () => {
      const options = { userId, assetValue: { assetId: noneFeePayingAssetId, value: 10n } };

      const mockSpendable = (value: bigint, numNotes: number) => {
        core.getSpendableSum.mockImplementation((_, assetId) => (assetId === noneFeePayingAssetId ? 10n : value));
        core.pickNotes.mockImplementation((_, assetId) => {
          if (assetId === noneFeePayingAssetId) {
            return [{}, {}];
          } else {
            return Array(numNotes).fill({});
          }
        });
      };

      {
        for (let numNotes = 0; numNotes < 2; ++numNotes) {
          // Need at least (109n + 105n).
          // The user will have to deposit or transfer a note with enough value to make the transaction.
          // After the addition of the new note, the asset's total number of notes is still less than 3.
          // No merge is required.
          mockSpendable(213n, numNotes);

          expect(await feeCalculator.getWithdrawFees(assetId, options)).toEqual([
            { assetId, value: 109n + 105n },
            { assetId, value: 211n + 105n },
          ]);
        }
      }
      {
        // Need at least (109n + 105n).
        // The user will have to deposit or transfer a note with enough value to make the transaction.
        // After the addition of the new note, the asset's total number of notes will be 3.
        // 1 merge is required.
        mockSpendable(213n, 2);

        expect(await feeCalculator.getWithdrawFees(assetId, options)).toEqual([
          { assetId, value: 109n + 105n + 105n },
          { assetId, value: 211n + 105n + 105n },
        ]);
      }
      {
        // It takes 109n + 105n * 8n + 105n = 1054n in total to pay the fee for withdrawal, 8 merges and 1 fee paying tx.
        // But the max spendable sum is only 1053n.
        // Need 1 more merge after the user's deposited or transferred a new note with enough amount.
        mockSpendable(1053n, 10);

        expect(await feeCalculator.getWithdrawFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 109n + 105n * 8n + 105n + 105n },
          { assetId, value: 211n + 105n * 8n + 105n + 105n },
        ]);
        expect(
          await feeCalculator.getWithdrawFees(noneFeePayingAssetId, { ...options, feeSignificantFigures: 2 }),
        ).toEqual([
          { assetId, value: 1200n },
          { assetId, value: 1300n },
        ]);
      }
    });
  });

  describe('getTransferFees', () => {
    it('return fees for transfer', async () => {
      expect(await feeCalculator.getTransferFees(assetId)).toEqual([
        { assetId, value: 105n },
        { assetId, value: 207n },
      ]);
      expect(await feeCalculator.getTransferFees(assetId, { feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 110n },
        { assetId, value: 210n },
      ]);
    });

    it('return fees for transfering non fee paying asset', async () => {
      expect(await feeCalculator.getTransferFees(noneFeePayingAssetId)).toEqual([
        { assetId, value: 105n + 105n },
        { assetId, value: 207n + 105n },
      ]);
      expect(await feeCalculator.getTransferFees(noneFeePayingAssetId, { feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 210n },
        { assetId, value: 320n },
      ]);
    });

    it('return fees for transfering with chained txs', async () => {
      core.getSpendableSum.mockResolvedValue(1000n);

      const mockPickNotes = (numNotes: number) => {
        core.pickNotes.mockResolvedValue(Array(numNotes).fill({}));
      };

      const options = { userId, assetValue: { assetId, value: 10n } };
      {
        mockPickNotes(1);
        expect(await feeCalculator.getTransferFees(assetId, options)).toEqual([
          { assetId, value: 105n },
          { assetId, value: 207n },
        ]);
      }
      {
        mockPickNotes(2);
        expect(await feeCalculator.getTransferFees(assetId, options)).toEqual([
          { assetId, value: 105n },
          { assetId, value: 207n },
        ]);
      }
      {
        mockPickNotes(3);
        expect(await feeCalculator.getTransferFees(assetId, options)).toEqual([
          { assetId, value: 105n + 105n },
          { assetId, value: 207n + 105n },
        ]);
        expect(await feeCalculator.getTransferFees(assetId, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 210n },
          { assetId, value: 320n },
        ]);
      }
    });

    it('return fees for transfering non fee paying asset with chained txs', async () => {
      core.getSpendableSum.mockResolvedValue(1100n);

      const mockPickNotes = (numNotes: number) => {
        core.pickNotes.mockImplementation((_, assetId) => {
          if (assetId === noneFeePayingAssetId) {
            return Array(numNotes).fill({});
          } else {
            return [{}, {}];
          }
        });
      };

      const options = { userId, assetValue: { assetId: noneFeePayingAssetId, value: 10n } };
      {
        mockPickNotes(1);
        expect(await feeCalculator.getTransferFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 105n + 105n },
          { assetId, value: 207n + 105n },
        ]);
      }
      {
        mockPickNotes(2);
        expect(await feeCalculator.getTransferFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 105n + 105n },
          { assetId, value: 207n + 105n },
        ]);
      }
      {
        mockPickNotes(3);
        expect(await feeCalculator.getTransferFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 105n + 105n * 2n },
          { assetId, value: 207n + 105n * 2n },
        ]);
      }
      {
        // It takes 105n + 105n * 7n + 105n = 945n in total to pay the fee for 1 transfer and 7 merges of non fee paying
        // asset, and 1 transfer for fee paying tx.
        mockPickNotes(9);
        expect(await feeCalculator.getTransferFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 105n + 105n * 7n + 105n },
          { assetId, value: 207n + 105n * 7n + 105n },
        ]);
        expect(
          await feeCalculator.getTransferFees(noneFeePayingAssetId, { ...options, feeSignificantFigures: 2 }),
        ).toEqual([
          { assetId, value: 950n },
          { assetId, value: 1100n },
        ]);
      }
    });

    it('return fees for transfering without enough spendable sum', async () => {
      const options = { userId, assetValue: { assetId, value: 10n } };

      const mockSpendable = (value: bigint, numNotes: number) => {
        core.getSpendableSum.mockResolvedValue(value);
        core.pickNotes.mockResolvedValue(Array(numNotes).fill({}));
      };

      {
        for (let numNotes = 0; numNotes < 2; ++numNotes) {
          // Need at least (value + fee === 10n + 105n).
          // The user will have to deposit or transfer a note with enough value to make the transaction.
          // After the addition of the new note, the asset's total number of notes is still less than 3.
          // No merge is required.
          mockSpendable(114n, numNotes);

          expect(await feeCalculator.getTransferFees(assetId, options)).toEqual([
            { assetId, value: 105n },
            { assetId, value: 207n },
          ]);
        }
      }
      {
        // Need at least (value + fee === 10n + 105n).
        // The user will have to deposit or transfer a note with enough value to make the transaction.
        // After the addition of the new note, the asset's total number of notes will be 3.
        // 1 merge is required.
        mockSpendable(114n, 2);

        expect(await feeCalculator.getTransferFees(assetId, options)).toEqual([
          { assetId, value: 105n + 105n },
          { assetId, value: 207n + 105n },
        ]);
      }
      {
        // It takes 10n + 105n + 105n * 7n = 850n in total for the trasnfer value, fee for faster rollup, and 7 merges.
        // But the max spendable sum is only 849n.
        // Need 1 more merge after the user's deposited or transferred a new note with enough amount.
        mockSpendable(849n, 9);

        expect(await feeCalculator.getTransferFees(assetId, options)).toEqual([
          { assetId, value: 105n + 105n * 7n + 105n },
          { assetId, value: 207n + 105n * 7n + 105n },
        ]);
        expect(await feeCalculator.getTransferFees(assetId, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 950n },
          { assetId, value: 1100n },
        ]);
      }
    });

    it('return fees for transfering without enough spendable sum', async () => {
      const options = { userId, assetValue: { assetId: noneFeePayingAssetId, value: 10n } };

      const mockSpendable = (value: bigint, numNotes: number, numNonFeePayingNotes = 2) => {
        core.getSpendableSum.mockImplementation((_, assetId) => (assetId === noneFeePayingAssetId ? 10n : value));
        core.pickNotes.mockImplementation((_, assetId) => {
          if (assetId === noneFeePayingAssetId) {
            return Array(numNonFeePayingNotes).fill({});
          } else {
            return Array(numNotes).fill({});
          }
        });
      };

      {
        for (let numNotes = 0; numNotes < 2; ++numNotes) {
          // Need at least (105n + 105n).
          // The user will have to deposit or transfer a note with enough value to make the transaction.
          // After the addition of the new note, the asset's total number of notes is still less than 3.
          // No merge is required.
          mockSpendable(209n, numNotes);

          expect(await feeCalculator.getTransferFees(assetId, options)).toEqual([
            { assetId, value: 105n + 105n },
            { assetId, value: 207n + 105n },
          ]);
        }
      }
      {
        // Need at least (105n + 105n).
        // The user will have to deposit or transfer a note with enough value to make the transaction.
        // After the addition of the new note, the asset's total number of notes will be 3.
        // 1 merge is required.
        mockSpendable(209n, 2);

        expect(await feeCalculator.getTransferFees(assetId, options)).toEqual([
          { assetId, value: 105n + 105n * 2n },
          { assetId, value: 207n + 105n * 2n },
        ]);
      }
      {
        // It takes 105n + 105n * 2n + 105n * 5n + 105n = 945n in total to pay the fee for transfer, 2 merges of non fee
        // paying asset, and 1 transfer and 5 merges of fee paying asset.
        // But the max spendable sum is only 944n.
        // Need 1 more merge after the user's deposited or transferred a new note with enough amount.
        mockSpendable(944n, 7, 4);
        expect(await feeCalculator.getTransferFees(noneFeePayingAssetId, options)).toEqual([
          { assetId, value: 105n + 105n * 2n + 105n * 5n + 105n + 105n },
          { assetId, value: 207n + 105n * 2n + 105n * 5n + 105n + 105n },
        ]);
        expect(
          await feeCalculator.getTransferFees(noneFeePayingAssetId, { ...options, feeSignificantFigures: 2 }),
        ).toEqual([
          { assetId, value: 1100n },
          { assetId, value: 1200n },
        ]);
      }
    });
  });

  describe('getDefiFees', () => {
    const userId = GrumpkinAddress.random();

    it('return fees for defi interaction without specifying deposit value', async () => {
      const bridgeCallData = new BridgeCallData(0, assetId, 3);
      expect(await feeCalculator.getDefiFees(bridgeCallData)).toEqual([
        { assetId, value: 111n },
        { assetId, value: 222n },
        { assetId, value: 333n },
      ]);
      expect(await feeCalculator.getDefiFees(bridgeCallData, { feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 120n },
        { assetId, value: 230n },
        { assetId, value: 340n },
      ]);
    });

    it('return fees for defi interaction whose input asset is not a fee paying asset', async () => {
      const bridgeCallData = new BridgeCallData(0, noneFeePayingAssetId, 3);
      expect(await feeCalculator.getDefiFees(bridgeCallData)).toEqual([
        { assetId, value: 111n + 105n },
        { assetId, value: 222n + 105n },
        { assetId, value: 333n + 105n },
      ]);
      expect(await feeCalculator.getDefiFees(bridgeCallData, { feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 220n },
        { assetId, value: 330n },
        { assetId, value: 440n },
      ]);
    });

    it('return fees for defi interaction that only needs a defi deposit proof', async () => {
      const bridgeCallData = new BridgeCallData(0, assetId, 3);
      const options = { userId, assetValue: { assetId, value: 100n } };

      core.getSpendableSum.mockResolvedValue(1000n);

      {
        // Found 1 note that has the exact value of (deposit + fee).
        core.pickNotes.mockImplementation((_, __, value) => [{ value }]);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n },
          { assetId, value: 222n },
          { assetId, value: 333n },
        ]);
      }
      {
        // Found 2 notes that sum to (deposit + fee).
        core.pickNotes.mockImplementation((_, __, value) => [{ value: 50n }, { value: value - 50n }]);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n },
          { assetId, value: 222n },
          { assetId, value: 333n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 120n },
          { assetId, value: 230n },
          { assetId, value: 340n },
        ]);
      }
    });

    it('return fees for defi interaction that needs a join split and a defi deposit proof', async () => {
      const bridgeCallData = new BridgeCallData(0, assetId, 3);
      const options = { userId, assetValue: { assetId, value: 100n } };

      core.getSpendableSum.mockResolvedValue(1000n);

      {
        // Found 1 note whose value is larger than (deposit + fee).
        core.pickNotes.mockImplementation((_, __, value) => [{ value: value + 1n }]);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n },
          { assetId, value: 222n + 105n },
          { assetId, value: 333n + 105n },
        ]);
      }
      {
        // Found 2 notes whose sum is larger than (deposit + fee).
        core.pickNotes.mockImplementation((_, __, value) => [{ value: 50n }, { value: value - 50n + 1n }]);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n },
          { assetId, value: 222n + 105n },
          { assetId, value: 333n + 105n },
        ]);
      }
      {
        // Found 3 notes whose sum is (deposit + fee).
        core.pickNotes.mockImplementation((_, __, value) => [{ value: 50n }, { value: 20n }, { value: value - 70n }]);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n },
          { assetId, value: 222n + 105n },
          { assetId, value: 333n + 105n },
        ]);
      }
      {
        // Found 3 notes whose sum is larger than (deposit + fee).
        core.pickNotes.mockImplementation((_, __, value) => [
          { value: 50n },
          { value: 20n },
          { value: value - 70n + 1n },
        ]);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n },
          { assetId, value: 222n + 105n },
          { assetId, value: 333n + 105n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 220n },
          { assetId, value: 330n },
          { assetId, value: 440n },
        ]);
      }
    });

    it('return fees for defi interaction that needs chained txs and a defi deposit proof', async () => {
      const bridgeCallData = new BridgeCallData(0, assetId, 3);
      const options = { userId, assetValue: { assetId, value: 100n } };

      core.getSpendableSum.mockResolvedValue(1000n);

      const mockPickNotes = (numNotes: number) => {
        core.pickNotes.mockResolvedValue(Array(numNotes).fill({ value: 10n }));
      };

      {
        mockPickNotes(4);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n * 2n },
          { assetId, value: 222n + 105n * 2n },
          { assetId, value: 333n + 105n * 2n },
        ]);
      }
      {
        mockPickNotes(6);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n * 4n },
          { assetId, value: 222n + 105n * 4n },
          { assetId, value: 333n + 105n * 4n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 540n },
          { assetId, value: 650n },
          { assetId, value: 760n },
        ]);
      }
    });

    it('return fees for defi interaction that needs defi deposit and fee paying tx', async () => {
      const bridgeCallData = new BridgeCallData(0, noneFeePayingAssetId, 3);
      const options = { userId, assetValue: { assetId: noneFeePayingAssetId, value: 100n } };

      core.getSpendableSum.mockResolvedValue(1000n);

      {
        core.pickNotes.mockImplementation((_, assetId, value) => {
          if (assetId === noneFeePayingAssetId) {
            // Found 2 notes that sum to (deposit: 100n).
            return [{ value: 40n }, { value: 60n }];
          } else {
            // Found 2 notes that sum to (fee).
            return [{ value: 10n }, { value: value - 10n }];
          }
        });

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n },
          { assetId, value: 222n + 105n },
          { assetId, value: 333n + 105n },
        ]);
      }

      {
        core.pickNotes.mockImplementation((_, assetId, value) => {
          if (assetId === noneFeePayingAssetId) {
            // Found 3 notes that sum to (deposit: 100n).
            return [{ value: 40n }, { value: 50n }, { value: 10n }];
          } else {
            // Found 5 notes that sum to (fee).
            return [{ value: 10n }, { value: 10n }, { value: 10n }, { value: 10n }, { value: value - 40n }];
          }
        });

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n + 105n * 4n },
          { assetId, value: 222n + 105n + 105n * 4n },
          { assetId, value: 333n + 105n + 105n * 4n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 640n },
          { assetId, value: 750n },
          { assetId, value: 860n },
        ]);
      }
    });

    it('return fees for defi interaction that does not have enough spendable sum', async () => {
      const bridgeCallData = new BridgeCallData(0, assetId, 3);
      const options = { userId, assetValue: { assetId, value: 100n } };

      const mockSpendable = (value: bigint, numNotes: number) => {
        core.getSpendableSum.mockResolvedValue(value);
        const noteValue = numNotes ? value / BigInt(numNotes) : 0n;
        core.pickNotes.mockResolvedValue(
          [...Array(numNotes)].map((_, i) => ({ value: !i ? value - noteValue * BigInt(numNotes - 1) : noteValue })),
        );
      };

      {
        for (let numNotes = 0; numNotes < 2; ++numNotes) {
          // Need at least (value + fee === 100n + 111n). But the max spendable sum is only 210n.
          // The user will have to deposit or transfer a note with enough value to make the transaction.
          // After the addition of the new note, the asset's total number of notes is still less than 3.
          // No merge is required.
          mockSpendable(210n, numNotes);

          expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
            { assetId, value: 111n },
            { assetId, value: 222n },
            { assetId, value: 333n },
          ]);
        }
      }
      {
        // Need at least (value + fee === 100n + 111n). But the max spendable sum is only 210n.
        // The user will have to deposit or transfer a note with enough value to make the transaction.
        // After the addition of the new note, the asset's total number of notes will be 3.
        // 1 merge is required.
        mockSpendable(210n, 2);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n },
          { assetId, value: 222n + 105n },
          { assetId, value: 333n + 105n },
        ]);
      }
      {
        // It takes 100n + 111n + 105n * 8n = 1051n in total for deposit value, fee and 8 merges.
        // But the max spendable sum is only 1050n.
        // Need 1 more merge after the user's deposited or transferred a new note with enough amount.
        mockSpendable(1050n, 10);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n * 8n + 105n },
          { assetId, value: 222n + 105n * 8n + 105n },
          { assetId, value: 333n + 105n * 8n + 105n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 1100n },
          { assetId, value: 1200n },
          { assetId, value: 1300n },
        ]);
      }
    });

    it('return fees for defi interaction that does not have enough spendable balance for fee paying asset', async () => {
      const bridgeCallData = new BridgeCallData(0, noneFeePayingAssetId, 3);
      const options = { userId, assetValue: { assetId: noneFeePayingAssetId, value: 100n } };

      const mockSpendable = (value: bigint, numNotes: number) => {
        core.getSpendableSum.mockImplementation((_, assetId) => (assetId === noneFeePayingAssetId ? 100n : value));
        core.pickNotes.mockImplementation((_, assetId) => {
          if (assetId === noneFeePayingAssetId) {
            // Found 2 notes that sum to (deposit: 100n).
            return [{ value: 40n }, { value: 60n }];
          } else {
            return Array(numNotes).fill({});
          }
        });
      };

      {
        for (let numNotes = 0; numNotes < 2; ++numNotes) {
          // Need at least (111n + 105n = 216n) for fee paying asset.
          // The user will have to deposit or transfer a note with enough value to pay the fee.
          // After the addition of the new note, the asset's total number of notes is still less than 3.
          // No merge is required.
          mockSpendable(215n, numNotes);

          expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
            { assetId, value: 111n + 105n },
            { assetId, value: 222n + 105n },
            { assetId, value: 333n + 105n },
          ]);
        }
      }
      {
        // Need at least (111n + 105n = 216n) for fee paying asset.
        // The user will have to deposit or transfer a note with enough value to pay the fee.
        // After the addition of the new note, the asset's total number of notes will be 3.
        // 1 merge is required.
        mockSpendable(215n, 2);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n * 2n },
          { assetId, value: 222n + 105n * 2n },
          { assetId, value: 333n + 105n * 2n },
        ]);
      }
      {
        // It takes 111n + 105n * 5n + 105n = 741n in total to pay the fee for defi deposit, 5 merges and 1 fee paying tx.
        // But the max spendable sum is only 740n.
        // Need 1 more merge after the user's deposited or transferred a new note with enough amount.
        mockSpendable(740n, 7);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n * 5n + 105n * 2n },
          { assetId, value: 222n + 105n * 5n + 105n * 2n },
          { assetId, value: 333n + 105n * 5n + 105n * 2n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 850n },
          { assetId, value: 960n },
          { assetId, value: 1100n },
        ]);
      }
    });

    it('return fees for defi interaction that needs a join split, a defi deposit, and a fee paying tx', async () => {
      const bridgeCallData = new BridgeCallData(0, noneFeePayingAssetId, 3);
      const options = { userId, assetValue: { assetId: noneFeePayingAssetId, value: 100n } };

      core.getSpendableSum.mockResolvedValue(1000n);

      core.pickNotes.mockImplementation((_, assetId, value) => {
        if (assetId === noneFeePayingAssetId) {
          // Found 2 notes whose sum is larger than (deposit: 100n).
          return [{ value: 40n }, { value: 61n }];
        } else {
          // Found 2 notes that sum to (fee).
          return [{ value: 10n }, { value: value - 10n }];
        }
      });

      expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
        { assetId, value: 111n + 105n * 2n },
        { assetId, value: 222n + 105n * 2n },
        { assetId, value: 333n + 105n * 2n },
      ]);
      expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 330n },
        { assetId, value: 440n },
        { assetId, value: 550n },
      ]);
    });

    it('return fees for defi interaction that has two input assets and only needs a defi deposit proof', async () => {
      const bridgeCallData = new BridgeCallData(0, assetId, 3, assetIdB);
      const options = { userId, assetValue: { assetId, value: 100n } };

      core.getSpendableSum.mockResolvedValue(1000n);

      // Found 1 note whose value equals the expected value.
      core.pickNote.mockImplementation((_, __, value) => ({ value }));
      core.pickNotes.mockImplementation((_, __, value) => [{ value }]);

      expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
        { assetId, value: 111n },
        { assetId, value: 222n },
        { assetId, value: 333n },
      ]);
      expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 120n },
        { assetId, value: 230n },
        { assetId, value: 340n },
      ]);
    });

    it('return fees for defi interaction that has two input assets and needs a join split and a defi deposit', async () => {
      const bridgeCallData = new BridgeCallData(0, assetId, 3, assetIdB);
      const options = { userId, assetValue: { assetId, value: 100n } };

      core.getSpendableSum.mockResolvedValue(1000n);

      {
        core.pickNote.mockImplementation((_, assetId, value) => {
          if (assetId === assetIdB) {
            // Input asset B: Found 1 note whose value equals (deposit).
            return { value };
          } else {
            // Input asset A: Found 1 note whose value is larger than (deposit + fee).
            return { value: value + 1n };
          }
        });

        core.pickNotes.mockImplementation((_, assetId, value) => {
          if (assetId === assetIdB) {
            return;
          } else {
            // Found 2 notes for assetA whose value is larger than (deposit + fee).
            return [{ value: 10n }, { value: value - 10n + 1n }];
          }
        });

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n },
          { assetId, value: 222n + 105n },
          { assetId, value: 333n + 105n },
        ]);
      }

      {
        core.pickNote.mockImplementation((_, assetId, value) => {
          if (assetId === assetIdB) {
            // Input asset B: Found 1 note whose value equals (deposit).
            return { value };
          } else {
            // Input asset A: Found 0 notes whose value are at least (deposit + fee).
            return;
          }
        });

        core.pickNotes.mockImplementation((_, assetId, value) => {
          if (assetId === assetIdB) {
            return;
          } else {
            // Found 1 note for assetA whose value is larger than (deposit + fee).
            return [{ value: value + 1n }];
          }
        });

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n },
          { assetId, value: 222n + 105n },
          { assetId, value: 333n + 105n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 220n },
          { assetId, value: 330n },
          { assetId, value: 440n },
        ]);
      }

      {
        core.pickNote.mockImplementation((_, assetId, value) => {
          if (assetId === assetIdB) {
            // Input asset B: Found 1 note whose value is larger than (deposit).
            return { value: value + 1n };
          } else {
            // Input asset A: Found 1 note whose value equals (deposit + fee).
            return { value };
          }
        });

        core.pickNotes.mockImplementation((_, assetId, value) => {
          if (assetId === assetIdB) {
            // Found two notes for assetB whose value is larger than (deposit).
            return [{ value: 10n }, { value: value - 10n + 1n }];
          } else {
            return;
          }
        });

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n },
          { assetId, value: 222n + 105n },
          { assetId, value: 333n + 105n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 220n },
          { assetId, value: 330n },
          { assetId, value: 440n },
        ]);
      }
    });

    it('return fees for defi interaction that has two input assets and needs chained txs and a defi deposit', async () => {
      const bridgeCallData = new BridgeCallData(0, assetId, 3, assetIdB);
      const options = { userId, assetValue: { assetId, value: 100n } };

      core.getSpendableSum.mockResolvedValue(1000n);

      const mockPickNotes = (targetAsset: number, numNotes: number, excessValue = 1n) => {
        core.pickNotes.mockImplementation((_, assetId, value) => {
          if (assetId === targetAsset) {
            return [...Array(numNotes)].map((_, i) => ({
              value: i === numNotes - 1 ? value - 10n * BigInt(numNotes - 1) + excessValue : 10n,
            }));
          } else {
            return [];
          }
        });
      };

      {
        core.pickNote.mockImplementation((_, assetId, value) => {
          if (assetId === assetIdB) {
            // Input asset B: Found 1 note whose value equals (deposit).
            return { value };
          } else {
            // Input asset A: Found 0 notes whose value are at least (deposit + fee).
            return;
          }
        });

        mockPickNotes(assetId, 3);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n * 2n },
          { assetId, value: 222n + 105n * 2n },
          { assetId, value: 333n + 105n * 2n },
        ]);
      }
      {
        core.pickNote.mockImplementation((_, assetId, value) => {
          if (assetId === assetIdB) {
            // Input asset B: Found 0 notes whose value are at least (deposit).
            return;
          } else {
            // Input asset A: Found 1 note whose value equals (deposit + fee).
            return { value };
          }
        });

        mockPickNotes(assetIdB, 5);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n * 4n },
          { assetId, value: 222n + 105n * 4n },
          { assetId, value: 333n + 105n * 4n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 540n },
          { assetId, value: 650n },
          { assetId, value: 760n },
        ]);
      }
    });

    it('return 0 fees for defi interaction that has two input assets and needs chained txs for both assets', async () => {
      const bridgeCallData = new BridgeCallData(0, assetId, 3, assetIdB);
      const options = { userId, assetValue: { assetId, value: 100n } };

      core.getSpendableSum.mockResolvedValue(1000n);

      const mockPickNotes = (targetAsset: number, numNotes: number) => {
        core.pickNotes.mockImplementation((_, assetId, value) => {
          if (assetId === targetAsset) {
            return [...Array(numNotes)].map((_, i) => ({
              value: i === numNotes - 1 ? value - 10n * BigInt(numNotes - 1) : 10n,
            }));
          } else {
            return [];
          }
        });
      };

      {
        // Found 1 note whose value is larger than the expected value.
        core.pickNote.mockImplementation((_, __, value) => ({ value: value + 1n }));

        mockPickNotes(assetId, 2);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 0n },
          { assetId, value: 0n },
          { assetId, value: 0n },
        ]);
      }
      {
        core.pickNote.mockImplementation((_, assetId, value) => {
          if (assetId === assetIdB) {
            // Input asset B: Found 1 note whose value is larger than (deposit).
            return { value: value + 1n };
          } else {
            // Input asset A: Found 0 notes whose value are at least (deposit + fee).
            return;
          }
        });

        mockPickNotes(assetId, 2);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 0n },
          { assetId, value: 0n },
          { assetId, value: 0n },
        ]);
      }
      {
        core.pickNote.mockImplementation(() => undefined);

        mockPickNotes(assetId, 2);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 0n },
          { assetId, value: 0n },
          { assetId, value: 0n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 0n },
          { assetId, value: 0n },
          { assetId, value: 0n },
        ]);
      }
    });

    it('return fees for defi interaction that has two input assets and needs a join split, a defi deposit and a fee paying tx', async () => {
      const bridgeCallData = new BridgeCallData(0, noneFeePayingAssetId, 3, 4);
      const options = { userId, assetValue: { assetId: noneFeePayingAssetId, value: 100n } };

      core.getSpendableSum.mockResolvedValue(1000n);

      core.pickNote.mockImplementation((_, assetId, value) => {
        if (assetId === assetIdB) {
          // Input asset B: Found 1 note whose value equals (deposit).
          return { value };
        } else {
          // Input asset A: Found 1 note whose value is larger than (deposit).
          return { value: value + 1n };
        }
      });

      core.pickNotes.mockImplementation((_, assetId, value) => {
        if (assetId === assetId) {
          // Found 1 note for fee paying asset whose value is larger than (deposit + fee).
          return [{ value: value + 1n }];
        }
      });

      expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
        { assetId, value: 111n + 105n * 2n },
        { assetId, value: 222n + 105n * 2n },
        { assetId, value: 333n + 105n * 2n },
      ]);
      expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 330n },
        { assetId, value: 440n },
        { assetId, value: 550n },
      ]);
    });

    it('return fees for defi interaction that has two input assets and does not have enough balance for fee paying asset', async () => {
      const bridgeCallData = new BridgeCallData(0, noneFeePayingAssetId, 3, assetIdB);
      const options = { userId, assetValue: { assetId: noneFeePayingAssetId, value: 100n } };

      const mockSpendable = (value: bigint, numNotes: number) => {
        core.getSpendableSum.mockImplementation((_, aid) => (aid !== assetId ? 100n : value));
        core.pickNote.mockImplementation((_, __, value) => ({ value }));
        core.pickNotes.mockImplementation((_, aid) => {
          if (aid !== assetId) {
            // Found 2 notes that sum to (deposit: 100n).
            return [{ value: 40n }, { value: 60n }];
          } else {
            return Array(numNotes).fill({});
          }
        });
      };

      {
        for (let numNotes = 0; numNotes < 2; ++numNotes) {
          // Need at least (111n + 105n).
          // The user will have to deposit or transfer a note with enough value to pay the fee.
          // After the addition of the new note, the asset's total number of notes is still less than 3.
          // No merge is required.
          mockSpendable(215n, numNotes);
          expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
            { assetId, value: 111n + 105n },
            { assetId, value: 222n + 105n },
            { assetId, value: 333n + 105n },
          ]);
        }
      }
      {
        // Need at least (111n + 105n).
        // The user will have to deposit or transfer a note with enough value to pay the fee.
        // After the addition of the new note, the asset's total number of notes will be 3.
        // 1 merge is required.
        mockSpendable(215n, 2);

        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n * 2n },
          { assetId, value: 222n + 105n * 2n },
          { assetId, value: 333n + 105n * 2n },
        ]);
      }
      {
        // It takes 111n + 105n * 5n + 105n = 741n in total to pay the fee for defi deposit, 5 merges and 1 fee paying tx.
        // But the max spendable sum is only 740n.
        // Need 1 more merge after the user's deposited or transferred a new note with enough amount.
        mockSpendable(740n, 7);
        expect(await feeCalculator.getDefiFees(bridgeCallData, options)).toEqual([
          { assetId, value: 111n + 105n * 5n + 105n * 2n },
          { assetId, value: 222n + 105n * 5n + 105n * 2n },
          { assetId, value: 333n + 105n * 5n + 105n * 2n },
        ]);
        expect(await feeCalculator.getDefiFees(bridgeCallData, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 850n },
          { assetId, value: 960n },
          { assetId, value: 1100n },
        ]);
      }
    });
  });

  describe('getAccountFees', () => {
    const apiNames = ['getRegisterFees', 'getRecoverAccountFees', 'getMigrateAccountFees'];

    it('returns fees for account tx', async () => {
      for (const apiName of apiNames) {
        expect(await feeCalculator[apiName](assetId)).toEqual([
          { assetId, value: 103n + 110n },
          { assetId, value: 204n + 110n },
        ]);
        expect(await feeCalculator[apiName](assetId, { feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 220n },
          { assetId, value: 320n },
        ]);
      }
    });
  });

  describe('getAddSpendingKeyFees', () => {
    it('returns fees for adding spending keys', async () => {
      expect(await feeCalculator.getAddSpendingKeyFees(assetId)).toEqual([
        { assetId, value: 103n + 105n },
        { assetId, value: 204n + 105n },
      ]);
      expect(await feeCalculator.getAddSpendingKeyFees(assetId, { feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 210n },
        { assetId, value: 310n },
      ]);
    });

    it('return fees paid with chained txs', async () => {
      core.getSpendableSum.mockResolvedValue(1000n);

      const mockPickNotes = (numNotes: number) => {
        core.pickNotes.mockResolvedValue(Array(numNotes).fill({}));
      };

      const options = { userId };
      {
        mockPickNotes(1);
        expect(await feeCalculator.getAddSpendingKeyFees(assetId, options)).toEqual([
          { assetId, value: 103n + 105n },
          { assetId, value: 204n + 105n },
        ]);
      }
      {
        mockPickNotes(2);
        expect(await feeCalculator.getAddSpendingKeyFees(assetId, options)).toEqual([
          { assetId, value: 103n + 105n },
          { assetId, value: 204n + 105n },
        ]);
      }
      {
        mockPickNotes(3);
        expect(await feeCalculator.getAddSpendingKeyFees(assetId, options)).toEqual([
          { assetId, value: 103n + 105n * 2n },
          { assetId, value: 204n + 105n * 2n },
        ]);
      }
      {
        mockPickNotes(9);
        expect(await feeCalculator.getAddSpendingKeyFees(assetId, options)).toEqual([
          { assetId, value: 103n + 105n * 8n },
          // It takes 204n + 105n * 8n = 1044n in total to pay the fee for account proof and 8 merges.
          // But the max spendable sum is only 1000n.
          // Need 1 more merge after the user's deposited or transferred a new note with enough amount.
          { assetId, value: 204n + 105n * 8n + 105n },
        ]);
        expect(await feeCalculator.getAddSpendingKeyFees(assetId, { ...options, feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 950n },
          { assetId, value: 1200n },
        ]);
      }
    });
  });

  describe('getProofDataFees', () => {
    it('return fees for proofs', async () => {
      {
        const proofs = [mockProofData(ProofId.DEPOSIT)];
        const proofDataFee = 110n;
        expect(await feeCalculator.getProofDataFees(assetId, proofs)).toEqual([
          { assetId, value: 105n + proofDataFee },
          { assetId, value: 207n + proofDataFee },
        ]);
      }
      {
        const proofs = [
          mockProofData(ProofId.SEND),
          mockProofData(ProofId.DEPOSIT),
          mockProofData(ProofId.SEND),
          mockProofData(ProofId.WITHDRAW),
          mockProofData(ProofId.ACCOUNT),
        ];
        const proofDataFee = 105n + 110n + 105n + 106n + 103n;
        expect(await feeCalculator.getProofDataFees(assetId, proofs)).toEqual([
          { assetId, value: 105n + proofDataFee },
          { assetId, value: 207n + proofDataFee },
        ]);
      }
      {
        blockchain.isEmpty.mockResolvedValueOnce(true);
        const proofs = [
          mockProofData(ProofId.WITHDRAW),
          mockProofData(ProofId.SEND),
          mockProofData(ProofId.WITHDRAW),
          mockProofData(ProofId.SEND),
        ];
        const proofDataFee = 109n + 105n + 106n + 105n; // 425n
        expect(await feeCalculator.getProofDataFees(assetId, proofs)).toEqual([
          { assetId, value: 105n + proofDataFee },
          { assetId, value: 207n + proofDataFee },
        ]);
        expect(await feeCalculator.getProofDataFees(assetId, proofs, { feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 530n },
          { assetId, value: 630n },
        ]);
      }
    });

    it('return fees for defi proofs', async () => {
      const bridgeCallData = new BridgeCallData(123, assetId, 456);
      {
        const proofs = [mockDefiProofData(bridgeCallData)];
        expect(await feeCalculator.getProofDataFees(assetId, proofs)).toEqual([
          { assetId, value: 105n + 111n },
          { assetId, value: 105n + 222n },
          { assetId, value: 207n + 222n },
        ]);
      }
      {
        const proofs = [
          mockDefiProofData(bridgeCallData),
          mockDefiProofData(bridgeCallData),
          mockDefiProofData(bridgeCallData),
        ];
        expect(await feeCalculator.getProofDataFees(assetId, proofs)).toEqual([
          { assetId, value: 105n + 111n + 111n + 111n },
          { assetId, value: 105n + 222n + 111n + 111n },
          { assetId, value: 207n + 222n + 111n + 111n },
        ]);
        expect(await feeCalculator.getProofDataFees(assetId, proofs, { feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 440n },
          { assetId, value: 550n },
          { assetId, value: 660n },
        ]);
      }
    });

    it('return fees for mixed proofs', async () => {
      const bridgeCallData = new BridgeCallData(123, assetId, 456);
      {
        const proofs = [mockDefiProofData(bridgeCallData), mockProofData(ProofId.SEND), mockProofData(ProofId.ACCOUNT)];
        expect(await feeCalculator.getProofDataFees(assetId, proofs)).toEqual([
          { assetId, value: 105n + 111n + 105n + 103n },
          { assetId, value: 105n + 222n + 105n + 103n },
          { assetId, value: 207n + 222n + 105n + 103n },
        ]);
      }
    });

    it('return fees for defi proofs with more than 1 bridge', async () => {
      const bridge1 = new BridgeCallData(1, 2, 3);
      const bridge2 = new BridgeCallData(1, 3, 2);

      core.getDefiFees.mockImplementation((bridgeCallData: BridgeCallData) => {
        if (bridgeCallData.equals(bridge1)) {
          return [
            { assetId, value: 111n },
            { assetId, value: 222n },
            { assetId, value: 333n },
          ];
        } else {
          return [
            { assetId, value: 1400n },
            { assetId, value: 1500n },
            { assetId, value: 1600n },
          ];
        }
      });

      {
        const proofs = [mockDefiProofData(bridge1), mockDefiProofData(bridge1), mockDefiProofData(bridge1)];
        expect(await feeCalculator.getProofDataFees(assetId, proofs)).toEqual([
          { assetId, value: 105n + 111n + 111n + 111n },
          { assetId, value: 105n + 222n + 111n + 111n },
          { assetId, value: 207n + 222n + 111n + 111n },
        ]);
      }
      {
        const proofs = [mockDefiProofData(bridge1), mockDefiProofData(bridge2), mockDefiProofData(bridge1)];
        expect(await feeCalculator.getProofDataFees(assetId, proofs)).toEqual([
          { assetId, value: 105n + 111n + 1400n + 111n },
          { assetId, value: 105n + 222n + 1500n + 111n },
          { assetId, value: 207n + 222n + 1500n + 111n },
        ]);
      }
      {
        const proofs = [
          mockDefiProofData(bridge1),
          mockDefiProofData(bridge2),
          mockDefiProofData(bridge2),
          mockDefiProofData(bridge1),
          mockDefiProofData(bridge1),
        ];
        expect(await feeCalculator.getProofDataFees(assetId, proofs)).toEqual([
          { assetId, value: 105n + 111n + 1400n + 1400n + 111n + 111n }, // 3238n
          { assetId, value: 105n + 222n + 1500n + 1400n + 111n + 111n }, // 3449n
          { assetId, value: 207n + 222n + 1500n + 1400n + 111n + 111n }, // 3551n
        ]);
        expect(await feeCalculator.getProofDataFees(assetId, proofs, { feeSignificantFigures: 2 })).toEqual([
          { assetId, value: 3300n },
          { assetId, value: 3500n },
          { assetId, value: 3600n },
        ]);
      }
    });

    it('return fees for proofs with chained txs', async () => {
      const options = { userId };

      core.getSpendableSum.mockResolvedValue(950n);

      const mockPickNotes = (numNotes: number) => {
        core.pickNotes.mockResolvedValue(Array(numNotes).fill({}));
      };

      const proofs = [
        mockProofData(ProofId.DEPOSIT),
        mockProofData(ProofId.ACCOUNT),
        mockProofData(ProofId.DEPOSIT),
        mockProofData(ProofId.ACCOUNT),
        mockProofData(ProofId.WITHDRAW),
      ];
      const proofDataFee = 110n + 103n + 110n + 103n + 106n; // 532n

      mockPickNotes(1);
      expect(await feeCalculator.getProofDataFees(assetId, proofs, options)).toEqual([
        { assetId, value: 105n + proofDataFee },
        { assetId, value: 207n + proofDataFee },
      ]);

      mockPickNotes(3);
      expect(await feeCalculator.getProofDataFees(assetId, proofs, options)).toEqual([
        { assetId, value: 105n + proofDataFee + 105n },
        { assetId, value: 207n + proofDataFee + 105n },
      ]);

      mockPickNotes(4);
      expect(await feeCalculator.getProofDataFees(assetId, proofs, options)).toEqual([
        { assetId, value: 105n + proofDataFee + 105n * 2n },
        { assetId, value: 207n + proofDataFee + 105n * 2n },
      ]);

      // It takes 105n + proofDataFee + 105n * 3n = 952n in total for the proof data, fee paying tx and 3 merges.
      // But the max spendable sum is only 950n.
      // 1 more merge is required.
      mockPickNotes(5);
      expect(await feeCalculator.getProofDataFees(assetId, proofs, options)).toEqual([
        { assetId, value: 105n + proofDataFee + 105n * 3n + 105n }, // 1057n
        { assetId, value: 207n + proofDataFee + 105n * 3n + 105n }, // 1159n
      ]);
      expect(await feeCalculator.getProofDataFees(assetId, proofs, { ...options, feeSignificantFigures: 2 })).toEqual([
        { assetId, value: 1100n },
        { assetId, value: 1200n },
      ]);
    });
  });
});
