import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { DefiSettlementTime, TxSettlementTime } from '@aztec/barretenberg/rollup_provider';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdkInterface } from '../core_sdk';
import { roundUp } from './round_up';

export interface GetMaxTxValueOptions {
  userSpendingKeyRequired?: boolean;
  excludePendingNotes?: boolean;
  txSettlementTime?: TxSettlementTime;
  feeSignificantFigures?: number;
}

export class TxValueCalculator {
  constructor(private readonly core: CoreSdkInterface, private readonly blockchain: ClientEthereumBlockchain) {}

  public async getMaxWithdrawValue(
    userId: GrumpkinAddress,
    assetId: number,
    { recipient, ...options }: { recipient?: EthAddress } & GetMaxTxValueOptions = {},
  ) {
    const txType =
      recipient && !(await this.blockchain.isContract(recipient)) && !(await this.blockchain.isEmpty(recipient))
        ? TxType.WITHDRAW_TO_WALLET
        : TxType.WITHDRAW_HIGH_GAS;
    return await this.getMaxTxValueFromTxType(userId, assetId, txType, options);
  }

  public async getMaxTransferValue(userId: GrumpkinAddress, assetId: number, options: GetMaxTxValueOptions = {}) {
    return await this.getMaxTxValueFromTxType(userId, assetId, TxType.TRANSFER, options);
  }

  public async getMaxDefiValue(
    userId: GrumpkinAddress,
    bridgeCallData: BridgeCallData,
    {
      txSettlementTime = DefiSettlementTime.DEADLINE,
      ...options
    }: Omit<GetMaxTxValueOptions, 'txSettlementTime'> & { txSettlementTime?: DefiSettlementTime } = {},
  ) {
    const fee = (await this.core.getDefiFees(bridgeCallData))[txSettlementTime];
    const feeAssetId = fee.assetId;
    const assetIdA = bridgeCallData.inputAssetIdA;
    if (bridgeCallData.inputAssetIdB === undefined) {
      const txFees = await this.core.getTxFees(feeAssetId);
      const [transferFee] = txFees[TxType.TRANSFER];
      return await this.getMaxTxValueFromFee(userId, assetIdA, fee, transferFee, options);
    }

    const assetIdB = bridgeCallData.inputAssetIdB;
    const [transferFee] = (await this.core.getTxFees(feeAssetId))[TxType.TRANSFER];
    const { userSpendingKeyRequired, excludePendingNotes, feeSignificantFigures = 0 } = options;
    let maxValue = BigInt(0);
    let maxFee = BigInt(0);

    // Get the number of merges needed to create the exact note value for an asset.
    const getNumMerges = async (assetId: number, value: bigint, excludePendingNotes: boolean) => {
      const notes = await this.core.pickNotes(userId, assetId, value, userSpendingKeyRequired, excludePendingNotes);
      if (!notes.length) {
        return {};
      }
      const note = await this.core.pickNote(userId, assetId, value, userSpendingKeyRequired, excludePendingNotes);
      if (note?.value === value) {
        return { numMerges: 0, pendingIncluded: note.pending };
      } else {
        return { numMerges: Math.max(1, notes.length - 1), pendingIncluded: notes.some(n => n.pending) };
      }
    };

    const feeNoteValues =
      feeAssetId !== assetIdA
        ? (
            await this.core.getMaxSpendableNoteValues(userId, feeAssetId, userSpendingKeyRequired, excludePendingNotes)
          ).sort((a, b) => (a < b ? -1 : 1))
        : [];
    const getRequiredFee = (numMerges: number) => {
      let numFeeNotes = 1;
      while (numFeeNotes <= feeNoteValues.length) {
        const feeNotesSum = feeNoteValues.slice(-numFeeNotes).reduce((sum, n) => sum + n, BigInt(0));
        const feeNumTxs = Math.max(1, numFeeNotes - 1);
        const requiredFee = roundUp(
          fee.value + transferFee.value * BigInt(numMerges + feeNumTxs),
          feeSignificantFigures,
        );
        if (requiredFee <= feeNotesSum) {
          return requiredFee;
        }
        numFeeNotes++;
      }
    };

    // Pick one note for assetB. Pick one note or merge notes for assetA.
    const noteValuesB = (
      await this.core.getSpendableNoteValues(userId, assetIdB, userSpendingKeyRequired, excludePendingNotes)
    ).sort((a, b) => (a > b ? -1 : 1));
    for (const noteValue of noteValuesB) {
      if (noteValue < maxValue) {
        continue;
      }
      const isPending =
        (await this.core.pickNote(userId, assetIdB, noteValue, userSpendingKeyRequired, true))?.value !== noteValue;
      if (assetIdA !== feeAssetId) {
        const { numMerges } = await getNumMerges(assetIdA, noteValue, excludePendingNotes || isPending);
        if (numMerges === undefined) {
          continue;
        }
        const requiredFee = getRequiredFee(numMerges);
        if (requiredFee) {
          maxValue = noteValue;
          maxFee = requiredFee;
          break;
        }
      } else {
        const spendableValue = await this.core.getSpendableSum(
          userId,
          assetIdA,
          userSpendingKeyRequired,
          excludePendingNotes || isPending,
        );
        let numMerges = 0;
        let requiredValue = noteValue + roundUp(fee.value, feeSignificantFigures);
        while (requiredValue <= spendableValue) {
          if ((await getNumMerges(assetIdA, requiredValue, excludePendingNotes || isPending)).numMerges === numMerges) {
            maxValue = noteValue;
            maxFee = requiredValue - noteValue;
            break;
          }
          numMerges++;
          requiredValue = noteValue + roundUp(fee.value + transferFee.value * BigInt(numMerges), feeSignificantFigures);
        }
      }
    }

    // Pick one note for assetA. Pick one note or merge notes for assetB.
    const noteValuesA = (
      await this.core.getSpendableNoteValues(userId, assetIdA, userSpendingKeyRequired, excludePendingNotes)
    ).sort((a, b) => (a > b ? -1 : 1));
    for (const noteValue of noteValuesA) {
      if (noteValue < maxValue) {
        break;
      }
      const isPending =
        (await this.core.pickNote(userId, assetIdA, noteValue, userSpendingKeyRequired, true))?.value !== noteValue;
      if (assetIdA !== feeAssetId) {
        const { numMerges, pendingIncluded } = await getNumMerges(assetIdB, noteValue, excludePendingNotes ?? false);
        if (numMerges === undefined || (pendingIncluded && isPending)) {
          continue;
        }
        const requiredFee = getRequiredFee(numMerges);
        if (requiredFee) {
          maxValue = noteValue;
          maxFee = requiredFee;
          break;
        }
      } else {
        const spendableValue = await this.core.getSpendableSum(
          userId,
          assetIdB,
          userSpendingKeyRequired,
          excludePendingNotes ?? false,
        );
        let requiredNumMerges = 0;
        let requiredValue = noteValue - roundUp(fee.value, feeSignificantFigures);
        while (requiredValue > maxValue) {
          if (requiredValue <= spendableValue) {
            const { numMerges, pendingIncluded } = await getNumMerges(
              assetIdB,
              requiredValue,
              excludePendingNotes ?? false,
            );
            if (numMerges === requiredNumMerges && (!pendingIncluded || !isPending)) {
              maxValue = requiredValue;
              maxFee = roundUp(fee.value + transferFee.value * BigInt(requiredNumMerges), feeSignificantFigures);
              break;
            }
          }
          requiredNumMerges++;
          requiredValue =
            noteValue - roundUp(fee.value + transferFee.value * BigInt(requiredNumMerges), feeSignificantFigures);
        }
      }
    }

    return { assetId: bridgeCallData.inputAssetIdA, value: maxValue, fee: { assetId: feeAssetId, value: maxFee } };
  }

  private async getMaxTxValueFromTxType(
    userId: GrumpkinAddress,
    assetId: number,
    txType: TxType,
    { txSettlementTime = TxSettlementTime.NEXT_ROLLUP, ...options }: GetMaxTxValueOptions,
  ) {
    const txFees = await this.core.getTxFees(assetId);
    const fee = txFees[txType][txSettlementTime];
    const [transferFee] = txFees[TxType.TRANSFER];
    return await this.getMaxTxValueFromFee(userId, assetId, fee, transferFee, options);
  }

  private async getMaxTxValueFromFee(
    userId: GrumpkinAddress,
    assetId: number,
    fee: AssetValue,
    transferFee: AssetValue,
    { userSpendingKeyRequired = false, excludePendingNotes = false, feeSignificantFigures = 0 }: GetMaxTxValueOptions,
  ) {
    const noteValues = (
      await this.core.getMaxSpendableNoteValues(userId, assetId, userSpendingKeyRequired, excludePendingNotes)
    ).sort((a, b) => (a > b ? -1 : 1));
    let numNotes = noteValues.length;
    let maxValue = BigInt(0);
    let maxFee = BigInt(0);

    if (fee.assetId !== assetId) {
      const feeNoteValues = (
        await this.core.getMaxSpendableNoteValues(userId, fee.assetId, userSpendingKeyRequired, excludePendingNotes)
      ).sort((a, b) => (a < b ? -1 : 1));
      const getRequiredFee = (numMerges: number) => {
        let numFeeNotes = 1;
        while (numFeeNotes <= feeNoteValues.length) {
          const spendableFee = feeNoteValues.slice(0, numFeeNotes).reduce((sum, n) => sum + n, BigInt(0));
          const feeNumTxs = Math.max(1, numFeeNotes - 1);
          const requiredFee = roundUp(
            fee.value + transferFee.value * BigInt(numMerges + feeNumTxs),
            feeSignificantFigures,
          );
          if (requiredFee <= spendableFee) {
            return requiredFee;
          }
          numFeeNotes++;
        }
      };
      while (numNotes > 0) {
        const numMerges = Math.max(0, numNotes - 2);
        const requiredFee = getRequiredFee(numMerges);
        if (requiredFee) {
          const noteSum = noteValues.slice(0, numNotes).reduce((sum, n) => sum + n, BigInt(0));
          maxValue = noteSum;
          maxFee = requiredFee;
          break;
        }
        numNotes--;
      }
    } else {
      while (numNotes > 0) {
        const numMerges = Math.max(0, numNotes - 2);
        const noteSum = noteValues.slice(0, numNotes).reduce((sum, n) => sum + n, BigInt(0));
        const requiredFee = roundUp(fee.value + transferFee.value * BigInt(numMerges), feeSignificantFigures);
        const value = noteSum - requiredFee;
        if (value > maxValue || (value === maxValue && requiredFee < maxFee)) {
          maxValue = value;
          maxFee = requiredFee;
        }
        numNotes--;
      }
    }
    return { assetId, value: maxValue, fee: { assetId: fee.assetId, value: maxFee } };
  }
}
