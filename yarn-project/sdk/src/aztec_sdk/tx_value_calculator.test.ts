import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { randomBytes } from '@aztec/barretenberg/crypto';
import { DefiSettlementTime, TxSettlementTime } from '@aztec/barretenberg/rollup_provider';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdkInterface } from '../core_sdk/index.js';
import { NotePicker } from '../note_picker/index.js';
import { TxValueCalculator } from './tx_value_calculator.js';
import { jest } from '@jest/globals';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('tx value calculator', () => {
  let core: Mockify<CoreSdkInterface>;
  let blockchain: Mockify<ClientEthereumBlockchain>;
  let txValueCalculator: TxValueCalculator;
  const assetId = 1;
  const assetIdB = 2;
  const noneFeePayingAssetId = 3;
  const userId = GrumpkinAddress.random();

  interface MockNote {
    value: bigint;
    pending?: boolean;
  }

  const mockNotePicker = (notesA: MockNote[], notesB = notesA, noneFeePayingNotes = notesA) => {
    const notePickerA = new NotePicker(notesA.map(n => ({ ...n, nullifier: randomBytes(32) })) as any);
    const notePickerB = new NotePicker(notesB.map(n => ({ ...n, nullifier: randomBytes(32) })) as any);
    const notePickerC = new NotePicker(noneFeePayingNotes.map(n => ({ ...n, nullifier: randomBytes(32) })) as any);
    const getNotePicker = (aid: number) =>
      aid === assetIdB ? notePickerB : aid === assetId ? notePickerA : notePickerC;
    core.getSpendableNoteValues.mockImplementation((_, aid, ownerAccountRequired, excludePendingNotes) =>
      getNotePicker(aid).getSpendableNoteValues({ ownerAccountRequired, excludePendingNotes }),
    );
    core.getSpendableSum.mockImplementation((_, aid, ownerAccountRequired, excludePendingNotes) =>
      getNotePicker(aid)
        .getSpendableNoteValues({
          ownerAccountRequired,
          excludePendingNotes,
        })
        .reduce((sum, v) => sum + v, 0n),
    );
    core.getMaxSpendableNoteValues.mockImplementation((_, aid, ownerAccountRequired, excludePendingNotes) =>
      getNotePicker(aid).getMaxSpendableNoteValues({ ownerAccountRequired, excludePendingNotes }),
    );
    core.pickNotes.mockImplementation((_, aid, value, ownerAccountRequired, excludePendingNotes) =>
      getNotePicker(aid).pick(value, { ownerAccountRequired, excludePendingNotes }),
    );
    core.pickNote.mockImplementation((_, aid, value, ownerAccountRequired, excludePendingNotes) =>
      getNotePicker(aid).pickOne(value, {
        ownerAccountRequired,
        excludePendingNotes,
      }),
    );
  };

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
    withdrawToContract = [
      { assetId, value: 109n },
      { assetId, value: 211n },
    ],
    account = [
      { assetId, value: 103n },
      { assetId, value: 204n },
    ],
  } = {}) => {
    core.getTxFees.mockResolvedValue([deposit, transfer, withdrawToWallet, withdrawToContract, account]);
  };

  beforeEach(() => {
    core = {
      getTxFees: jest.fn<any>().mockResolvedValue([]),
      getDefiFees: jest.fn<any>().mockResolvedValue([
        { assetId, value: 111n },
        { assetId, value: 222n },
        { assetId, value: 333n },
      ]),
      getMaxSpendableNoteValues: jest.fn<any>().mockResolvedValue([]),
      getSpendableNoteValues: jest.fn<any>().mockResolvedValue([]),
      getSpendableSum: jest.fn<any>().mockResolvedValue(0n),
      pickNote: jest.fn<any>().mockResolvedValue(undefined),
      pickNotes: jest.fn<any>().mockResolvedValue([]),
    } as any;

    blockchain = {
      isContract: jest.fn<any>().mockResolvedValue(false),
      isEmpty: jest.fn<any>().mockResolvedValue(false),
    } as any;

    txValueCalculator = new TxValueCalculator(core, blockchain as any);

    mockTxFees();
  });

  describe('getMaxWithdrawValue', () => {
    it('return max value for withdrawal', async () => {
      {
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId)).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([500n]);
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId)).toEqual({
          assetId,
          value: 500n - 109n,
          fee: { assetId, value: 109n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([160n, 140n]);
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId)).toEqual({
          assetId,
          value: 160n + 140n - 109n,
          fee: { assetId, value: 109n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([120n, 250n, 130n]);
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId)).toEqual({
          assetId,
          value: 250n + 130n + 120n - 109n - 105n,
          fee: { assetId, value: 109n + 105n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([120n, 250n, 260n, 130n]);
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId)).toEqual({
          assetId,
          value: 260n + 250n + 130n + 120n - 109n - 105n * 2n,
          fee: { assetId, value: 109n + 105n * 2n }, // 319n
        });
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId, { feeSignificantFigures: 2 })).toEqual({
          assetId,
          value: 260n + 250n + 130n + 120n - 320n,
          fee: { assetId, value: 320n },
        });
      }
    });

    it('return correct max value for withdrawing to normal account', async () => {
      core.getMaxSpendableNoteValues.mockResolvedValue([150n, 130n, 120n]);
      const recipient = EthAddress.random();
      {
        blockchain.isContract.mockResolvedValue(false);
        blockchain.isEmpty.mockResolvedValue(false);
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId, { recipient })).toEqual({
          assetId,
          value: 150n + 130n + 120n - 106n - 105n,
          fee: { assetId, value: 106n + 105n }, // 211n
        });
        expect(
          await txValueCalculator.getMaxWithdrawValue(userId, assetId, { recipient, feeSignificantFigures: 2 }),
        ).toEqual({
          assetId,
          value: 150n + 130n + 120n - 220n,
          fee: { assetId, value: 220n },
        });
      }
    });

    it('return correct max value for withdrawing to contract or empty account', async () => {
      core.getMaxSpendableNoteValues.mockResolvedValue([150n, 130n, 120n]);
      const recipient = EthAddress.random();
      {
        blockchain.isContract.mockResolvedValue(true);
        blockchain.isEmpty.mockResolvedValue(false);
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId, { recipient })).toEqual({
          assetId,
          value: 150n + 130n + 120n - 109n - 105n,
          fee: { assetId, value: 109n + 105n },
        });
      }
      {
        blockchain.isContract.mockResolvedValue(false);
        blockchain.isEmpty.mockResolvedValue(true);
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId, { recipient })).toEqual({
          assetId,
          value: 150n + 130n + 120n - 109n - 105n,
          fee: { assetId, value: 109n + 105n }, // 214n
        });
        expect(
          await txValueCalculator.getMaxWithdrawValue(userId, assetId, { recipient, feeSignificantFigures: 2 }),
        ).toEqual({
          assetId,
          value: 150n + 130n + 120n - 220n,
          fee: { assetId, value: 220n },
        });
      }
    });

    it('return correct max value for faster settlement time', async () => {
      core.getMaxSpendableNoteValues.mockResolvedValue([150n, 130n, 120n]);
      const txSettlementTime = TxSettlementTime.INSTANT;
      {
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId, { txSettlementTime })).toEqual({
          assetId,
          value: 150n + 130n + 120n - 211n - 105n,
          fee: { assetId, value: 211n + 105n },
        });
      }
      {
        expect(
          await txValueCalculator.getMaxWithdrawValue(userId, assetId, {
            recipient: EthAddress.random(),
            txSettlementTime,
          }),
        ).toEqual({
          assetId,
          value: 150n + 130n + 120n - 208n - 105n,
          fee: { assetId, value: 208n + 105n }, // 313n
        });
        expect(
          await txValueCalculator.getMaxWithdrawValue(userId, assetId, {
            recipient: EthAddress.random(),
            txSettlementTime,
            feeSignificantFigures: 2,
          }),
        ).toEqual({
          assetId,
          value: 150n + 130n + 120n - 320n,
          fee: { assetId, value: 320n },
        });
      }
    });

    it('will not create unnecessary merges', async () => {
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([50n]);
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId)).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([140n, 50n, 150n, 130n]);
        // Create 1 merge for spending 150n + 140n + 130n.
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId)).toEqual({
          assetId,
          value: 150n + 140n + 130n - 109n - 105n,
          fee: { assetId, value: 109n + 105n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([20n, 40n, 100n, 60n, 70n]);
        // Create 0 merges for spending 100n + 70n.
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId)).toEqual({
          assetId,
          value: 100n + 70n - 109n,
          fee: { assetId, value: 109n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([200n, 160n, 106n]);
        // Create 1 merge for spending 200n + 160n + 105n.
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId)).toEqual({
          assetId,
          value: 200n + 160n + 106n - 109n - 105n,
          fee: { assetId, value: 109n + 105n },
        });
        // Create 0 merges for spending 200n + 160n.
        // When feeSignificantFigures is set to 2, the total fee with 1 merge will be 220n, and the value becomes
        // 200n + 160n + 106n - 220n = 246n, which is less than 200n + 160n - 110n = 250n.
        expect(await txValueCalculator.getMaxWithdrawValue(userId, assetId, { feeSignificantFigures: 2 })).toEqual({
          assetId,
          value: 200n + 160n - 110n,
          fee: { assetId, value: 110n },
        });
      }
    });

    it('create number of merges based on available fee', async () => {
      const notesA = [150n, 140n, 130n, 120n, 100n];
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : []));
        expect(await txValueCalculator.getMaxWithdrawValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : [213n]));
        expect(await txValueCalculator.getMaxWithdrawValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : [214n]));
        expect(await txValueCalculator.getMaxWithdrawValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n,
          fee: { assetId, value: 109n + 105n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) =>
          aid === noneFeePayingAssetId ? notesA : [216n, 103n],
        );
        expect(await txValueCalculator.getMaxWithdrawValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n,
          fee: { assetId, value: 109n + 105n * 2n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : [424n]));
        expect(await txValueCalculator.getMaxWithdrawValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n + 120n,
          fee: { assetId, value: 109n + 105n * 3n },
        });
      }
      {
        // Need to do 1 merge for fee paying assset. Only 1 merge can be done for assetA.
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) =>
          aid === noneFeePayingAssetId ? notesA : [180n, 120n, 124n],
        );
        expect(await txValueCalculator.getMaxWithdrawValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n,
          fee: { assetId, value: 109n + 105n * 3n },
        });
        // With feeSignificantFigures set to 2, spending 150n + 140n + 130n will cost 430n. But the balance is only 424n.
        expect(
          await txValueCalculator.getMaxWithdrawValue(userId, noneFeePayingAssetId, { feeSignificantFigures: 2 }),
        ).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n,
          fee: { assetId, value: 220n }, // 109n + 105n
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) =>
          aid === noneFeePayingAssetId ? notesA : [1000n],
        );
        expect(await txValueCalculator.getMaxWithdrawValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n + 120n + 100n,
          fee: { assetId, value: 109n + 105n * 4n },
        });
      }
    });
  });

  describe('getMaxTransferValue', () => {
    it('return max value for transfer', async () => {
      {
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId)).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([500n]);
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId)).toEqual({
          assetId,
          value: 500n - 105n,
          fee: { assetId, value: 105n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([104n, 102n]);
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId)).toEqual({
          assetId,
          value: 104n + 102n - 105n,
          fee: { assetId, value: 105n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([120n, 150n, 130n]);
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId)).toEqual({
          assetId,
          value: 150n + 130n + 120n - 105n * 2n,
          fee: { assetId, value: 105n * 2n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([120n, 150n, 160n, 130n]);
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId)).toEqual({
          assetId,
          value: 160n + 150n + 130n + 120n - 105n * 3n,
          fee: { assetId, value: 105n * 3n },
        });
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId, { feeSignificantFigures: 2 })).toEqual({
          assetId,
          value: 160n + 150n + 130n + 120n - 320n,
          fee: { assetId, value: 320n },
        });
      }
    });

    it('return correct max value for faster settlement time', async () => {
      core.getMaxSpendableNoteValues.mockResolvedValue([150n, 130n, 120n]);
      const txSettlementTime = TxSettlementTime.INSTANT;
      {
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId, { txSettlementTime })).toEqual({
          assetId,
          value: 150n + 130n + 120n - 207n - 105n,
          fee: { assetId, value: 207n + 105n }, // 312n
        });
        expect(
          await txValueCalculator.getMaxTransferValue(userId, assetId, { txSettlementTime, feeSignificantFigures: 2 }),
        ).toEqual({
          assetId,
          value: 150n + 130n + 120n - 320n,
          fee: { assetId, value: 320n },
        });
      }
    });

    it('will not create unnecessary merges', async () => {
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([104n]);
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId)).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([140n, 105n, 150n, 130n]);
        // Create 1 merge for spending 50n + 40n + 30n.
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId)).toEqual({
          assetId,
          value: 150n + 140n + 130n - 105n * 2n,
          fee: { assetId, value: 105n * 2n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([20n, 60n, 100n, 10n, 70n]);
        // Create 0 merges for spending 10n + 7n.
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId)).toEqual({
          assetId,
          value: 100n + 70n - 105n,
          fee: { assetId, value: 105n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([200n, 160n, 120n, 106n]);
        // Create 2 merges for spending 200n + 160n + 120n + 106n.
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId)).toEqual({
          assetId,
          value: 200n + 160n + 120n + 106n - 105n * 3n,
          fee: { assetId, value: 105n * 3n },
        });
        // Create 1 merges for spending 200n + 160n + 120n.
        // When feeSignificantFigures is set to 2, the total fee with 2 merges will be 320n, and the value becomes
        // 200n + 160n + 120n + 106n - 320n = 266n, which is less than 200n + 160n + 120n - 110n = 270n.
        expect(await txValueCalculator.getMaxTransferValue(userId, assetId, { feeSignificantFigures: 2 })).toEqual({
          assetId,
          value: 200n + 160n + 120n - 210n,
          fee: { assetId, value: 210n },
        });
      }
    });

    it('create number of merges based on available fee', async () => {
      const notesA = [150n, 140n, 130n, 120n, 90n];
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : []));
        expect(await txValueCalculator.getMaxTransferValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : [209n]));
        expect(await txValueCalculator.getMaxTransferValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : [210n]));
        expect(await txValueCalculator.getMaxTransferValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n,
          fee: { assetId, value: 105n * 2n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) =>
          aid === noneFeePayingAssetId ? notesA : [210n + 105n],
        );
        expect(await txValueCalculator.getMaxTransferValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n,
          fee: { assetId, value: 105n * 3n },
        });
        // With feeSignificantFigures set to 2, spending 150n + 140n + 130n will cost 320n. But the balance is only 315n.
        expect(
          await txValueCalculator.getMaxTransferValue(userId, noneFeePayingAssetId, { feeSignificantFigures: 2 }),
        ).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n,
          fee: { assetId, value: 210n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : [420n]));
        expect(await txValueCalculator.getMaxTransferValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n + 120n,
          fee: { assetId, value: 105n * 4n },
        });
      }
      {
        // Need to do 1 merge for fee paying assset. Only 1 merge can be done for assetA.
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) =>
          aid === noneFeePayingAssetId ? notesA : [200n, 120n, 100n],
        );
        expect(await txValueCalculator.getMaxTransferValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n,
          fee: { assetId, value: 105n * 4n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) =>
          aid === noneFeePayingAssetId ? notesA : [1000n],
        );
        expect(await txValueCalculator.getMaxTransferValue(userId, noneFeePayingAssetId)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n + 120n + 90n,
          fee: { assetId, value: 105n * 5n },
        });
      }
    });
  });

  describe('getMaxDefiValue', () => {
    const bridgeCallData = new BridgeCallData(123, assetId, 456);

    it('return max value for defi deposit', async () => {
      {
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([500n]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 500n - 111n,
          fee: { assetId, value: 111n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([70n, 50n]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 70n + 50n - 111n,
          fee: { assetId, value: 111n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([120n, 150n, 130n]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 150n + 130n + 120n - 111n - 105n,
          fee: { assetId, value: 111n + 105n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([120n, 150n, 160n, 130n]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 160n + 150n + 130n + 120n - 111n - 105n * 2n,
          fee: { assetId, value: 111n + 105n * 2n }, // 321n
        });
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { feeSignificantFigures: 2 })).toEqual({
          assetId,
          value: 160n + 150n + 130n + 120n - 330n,
          fee: { assetId, value: 330n },
        });
      }
    });

    it('return correct max value for faster settlement time', async () => {
      core.getMaxSpendableNoteValues.mockResolvedValue([250n, 130n, 120n]);
      {
        const txSettlementTime = DefiSettlementTime.NEXT_ROLLUP;
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { txSettlementTime })).toEqual({
          assetId,
          value: 250n + 130n + 120n - 222n - 105n,
          fee: { assetId, value: 222n + 105n },
        });
      }
      {
        const txSettlementTime = DefiSettlementTime.INSTANT;
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { txSettlementTime })).toEqual({
          assetId,
          value: 250n + 130n + 120n - 333n - 105n,
          fee: { assetId, value: 333n + 105n }, // 438n
        });
        expect(
          await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, {
            txSettlementTime,
            feeSignificantFigures: 2,
          }),
        ).toEqual({
          assetId,
          value: 250n + 130n + 120n - 440n,
          fee: { assetId, value: 440n },
        });
      }
    });

    it('will not create unnecessary merges', async () => {
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([110n]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([140n, 50n, 150n, 106n]);
        // Create 1 merge for spending 150n + 140n + 106n.
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 150n + 140n + 106n - 111n - 105n,
          fee: { assetId, value: 111n + 105n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockResolvedValue([20n, 40n, 100n, 60n, 70n]);
        // Create 0 merges for spending 10n + 7n.
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 100n + 70n - 111n,
          fee: { assetId, value: 111n },
        });
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { feeSignificantFigures: 2 })).toEqual({
          assetId,
          value: 100n + 70n - 120n,
          fee: { assetId, value: 120n },
        });
      }
    });

    it('create number of merges based on available fee', async () => {
      const bridgeCallData = new BridgeCallData(123, noneFeePayingAssetId, 456);
      const notesA = [150n, 140n, 130n, 120n, 90n];
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : []));
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : [215n]));
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) => (aid === noneFeePayingAssetId ? notesA : [216n]));
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n,
          fee: { assetId, value: 111n + 105n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) =>
          aid === noneFeePayingAssetId ? notesA : [111n, 210n],
        );
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n,
          fee: { assetId, value: 111n + 105n * 2n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) =>
          aid === noneFeePayingAssetId ? notesA : [111n + 210n + 105n],
        );
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n + 120n,
          fee: { assetId, value: 111n + 105n * 3n },
        });
      }
      {
        // Need to do 1 merge for fee paying assset. Only 1 merge can be done for assetA.
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) =>
          aid === noneFeePayingAssetId ? notesA : [111n, 210n, 105n],
        );
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n,
          fee: { assetId, value: 111n + 105n * 3n },
        });
        // With feeSignificantFigures set to 2, spending 150n + 140n + 130n will cost 430n. But the balance is only 424n.
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { feeSignificantFigures: 2 })).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n,
          fee: { assetId, value: 330n },
        });
      }
      {
        core.getMaxSpendableNoteValues.mockImplementation((_, aid) =>
          aid === noneFeePayingAssetId ? notesA : [1000n],
        );
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 150n + 140n + 130n + 120n + 90n,
          fee: { assetId, value: 111n + 105n * 4n },
        });
      }
    });
  });

  describe('getMaxDefiValue with two input assets', () => {
    const bridgeCallData = new BridgeCallData(123, assetId, 456, assetIdB);

    it('return max value for defi deposit', async () => {
      {
        mockNotePicker([{ value: 40n + 111n }, { value: 40n + 120n }], [{ value: 40n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 40n,
          fee: { assetId, value: 111n },
        });
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { feeSignificantFigures: 2 })).toEqual({
          assetId,
          value: 40n,
          fee: { assetId, value: 120n },
        });
      }
    });

    it('return max value for defi deposit with merges or split for assetB', async () => {
      {
        // Required value A: 50n (35n value + 216n fee).
        // Required value B: 35n. 1 split.
        mockNotePicker([{ value: 251n }], [{ value: 80n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 35n,
          fee: { assetId, value: 111n + 105n },
        });
      }
      {
        // Required value A: 256n (40n value + 216n fee).
        // Required value B: 40n. 1 merge (10n + 30n).
        mockNotePicker([{ value: 256n }], [{ value: 10n }, { value: 30n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 40n,
          fee: { assetId, value: 111n + 105n },
        });
      }
      {
        // Required value B: 40n. 3 merges (6n + 8n + 12n + 14n).
        mockNotePicker(
          [{ value: 466n }, { value: 470n }],
          [{ value: 6n }, { value: 8n }, { value: 12n }, { value: 14n }],
        );
        // Required value A: 466n (40n value + 426n fee).
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 40n,
          fee: { assetId, value: 111n + 105n * 3n },
        });
        // Required value A: 470n (40n value + 430n fee).
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { feeSignificantFigures: 2 })).toEqual({
          assetId,
          value: 40n,
          fee: { assetId, value: 430n },
        });
      }
    });

    it('return max value for defi deposit with merges or split for assetA', async () => {
      {
        // Required value B: 40n.
        mockNotePicker([{ value: 200n }, { value: 56n }, { value: 60n }], [{ value: 40n }]);
        // Required value A: 256n (40n value + 216n fee). 1 merge (200n + 56n).
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 40n,
          fee: { assetId, value: 111n + 105n },
        });
        // Required value A: 260n (40n value + 220n fee). 1 merge (200n + 60n).
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { feeSignificantFigures: 2 })).toEqual({
          assetId,
          value: 40n,
          fee: { assetId, value: 220n },
        });
      }
      {
        // Required value A: 256n (40n value + 216n fee). 1 split.
        // Required value B: 40n.
        mockNotePicker([{ value: 260n }, { value: 100n }], [{ value: 40n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 40n,
          fee: { assetId, value: 111n + 105n },
        });
      }
    });

    it('return 0 value for defi deposit without valid note combination', async () => {
      {
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        mockNotePicker([{ value: 14n }], [{ value: 7n }, { value: 8n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        mockNotePicker([{ value: 10n }, { value: 14n }], [{ value: 15n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { feeSignificantFigures: 2 })).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
    });

    it('return correct max value for faster settlement time', async () => {
      {
        const txSettlementTime = DefiSettlementTime.NEXT_ROLLUP;
        mockNotePicker([{ value: 252n }, { value: 260n }], [{ value: 30n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { txSettlementTime })).toEqual({
          assetId,
          value: 30n,
          fee: { assetId, value: 222n },
        });
        expect(
          await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, {
            txSettlementTime,
            feeSignificantFigures: 2,
          }),
        ).toEqual({
          assetId,
          value: 30n,
          fee: { assetId, value: 230n },
        });
      }
      {
        const txSettlementTime = DefiSettlementTime.INSTANT;
        mockNotePicker([{ value: 353n }, { value: 360n }], [{ value: 20n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { txSettlementTime })).toEqual({
          assetId,
          value: 20n,
          fee: { assetId, value: 333n },
        });
        expect(
          await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, {
            txSettlementTime,
            feeSignificantFigures: 2,
          }),
        ).toEqual({
          assetId,
          value: 20n,
          fee: { assetId, value: 340n },
        });
      }
    });

    it('will not create unnecessary merges', async () => {
      {
        mockNotePicker([{ value: 110n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        // Required value A: 256n (40n value + 216n fee).
        // Required value B: 10n + 30n.
        mockNotePicker([{ value: 256n }], [{ value: 10n }, { value: 30n }, { value: 5n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 40n,
          fee: { assetId, value: 111n + 105n },
        });
      }
      {
        // Required value A: 256n (40n value + 216n fee).
        // Required value B: 10n + 30n. 1 merge.
        mockNotePicker(
          [{ value: 1n }, { value: 256n }, { value: 4n }],
          [{ value: 10n }, { value: 5n }, { value: 30n }],
        );
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId,
          value: 40n,
          fee: { assetId, value: 111n + 105n },
        });
      }
    });

    it('create number of merges based on available fee', async () => {
      const bridgeCallData = new BridgeCallData(123, noneFeePayingAssetId, 456, assetIdB);
      const notesB = [{ value: 40n }, { value: 25n }, { value: 10n }, { value: 5n }];
      const notesNoneFeePaying = [{ value: 50n }, { value: 4n }, { value: 40n }, { value: 80n }];
      {
        // Does not have enough fee to pay for deposit (111n) and 1 merge or split (105n).
        mockNotePicker([{ value: 215n }], notesB, notesNoneFeePaying);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 0n,
          fee: { assetId, value: 0n },
        });
      }
      {
        // Pick 40n for asset B.
        // Pick 40n for asset A.
        mockNotePicker([{ value: 216n }], notesB, notesNoneFeePaying);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 40n,
          fee: { assetId, value: 111n + 105n },
        });
      }
      {
        // Merge 2 notes (40n + 10n) for asset B.
        // Pick 50n for asset A.
        mockNotePicker([{ value: 321n }], notesB, notesNoneFeePaying);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 50n,
          fee: { assetId, value: 111n + 105n * 2n },
        });
      }
      {
        // Split 1 note (100n) for asset B.
        // Pick 30n for asset A.
        mockNotePicker([{ value: 321n }], [{ value: 100n }], [{ value: 30n }, { value: 15n }]);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 30n,
          fee: { assetId, value: 111n + 105n * 2n },
        });
      }
      {
        // Merge 4 notes (40n + 25n + 10n + 5n) for asset B.
        // Pick 80n for asset A.
        mockNotePicker([{ value: 1000n }], notesB, notesNoneFeePaying);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 80n,
          fee: { assetId, value: 111n + 105n * 4n },
        });
      }
      {
        // Need 1 merge for fee paying asset.
        // Merge 2 notes (40n + 10n) for asset B.
        // Pick 50n for asset A.
        mockNotePicker([{ value: 110n }, { value: 110n }, { value: 210n }], notesB, notesNoneFeePaying);
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData)).toEqual({
          assetId: noneFeePayingAssetId,
          value: 50n,
          fee: { assetId, value: 111n + 105n * 3n }, // 426n
        });
        expect(await txValueCalculator.getMaxDefiValue(userId, bridgeCallData, { feeSignificantFigures: 2 })).toEqual({
          assetId: noneFeePayingAssetId,
          value: 50n,
          fee: { assetId, value: 430n },
        });
      }
    });
  });
});
