import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { DefiDepositProofData, JoinSplitProofData, ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { roundUp } from '@aztec/barretenberg/rounding';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdk } from '../core_sdk/index.js';

const accumeFees = (fees0: AssetValue[], fees1: AssetValue[]) =>
  !fees1.length ? fees0 : fees0.map((fee, i) => ({ ...fee, value: fee.value + fees1[i].value }));

const accumeBaseFees = (fees0: AssetValue[], fees1: AssetValue[]) =>
  !fees1.length ? fees0 : fees0.map(fee => ({ ...fee, value: fee.value + fees1[0].value }));

export interface GetFeesOptions {
  userId?: GrumpkinAddress;
  userSpendingKeyRequired?: boolean;
  excludePendingNotes?: boolean;
  feeSignificantFigures?: number;
}

export class FeeCalculator {
  constructor(private readonly core: CoreSdk, private readonly blockchain: ClientEthereumBlockchain) {}

  public async getDepositFees(assetId: number, options: { feeSignificantFigures?: number } = {}) {
    return await this.getTransactionFees(assetId, TxType.DEPOSIT, options);
  }

  public async getWithdrawFees(
    assetId: number,
    { recipient, ...options }: GetFeesOptions & { recipient?: EthAddress; assetValue?: AssetValue } = {},
  ) {
    const txType =
      recipient && !(await this.blockchain.isContract(recipient)) && !(await this.blockchain.isEmpty(recipient))
        ? TxType.WITHDRAW_TO_WALLET
        : TxType.WITHDRAW_HIGH_GAS;
    return await this.getTransactionFees(assetId, txType, options);
  }

  public async getTransferFees(assetId: number, options?: GetFeesOptions) {
    return await this.getTransactionFees(assetId, TxType.TRANSFER, options);
  }

  public async getDefiFees(
    bridgeCallData: BridgeCallData,
    options: GetFeesOptions & { assetValue?: AssetValue } = {},
  ): Promise<AssetValue[]> {
    const { userId, userSpendingKeyRequired, assetValue, feeSignificantFigures = 0 } = options;
    const assetId = bridgeCallData.inputAssetIdA;
    if (assetValue && assetValue.assetId !== assetId) {
      throw new Error('Inconsistent asset id.');
    }

    const fees = await this.core.getDefiFees(bridgeCallData);
    const feeAssetId = fees[0].assetId;
    const [transferFee] = (await this.core.getTxFees(feeAssetId))[TxType.TRANSFER];

    if (!assetValue) {
      const numTxs = feeAssetId !== assetId ? 1 : 0;
      return fees.map(fee => ({
        ...fee,
        value: roundUp(fee.value + transferFee.value * BigInt(numTxs), feeSignificantFigures),
      }));
    }

    if (!userId) {
      throw new Error(`'userId' not provided.`);
    }

    const depositValue = assetValue.value;
    let { excludePendingNotes } = options;

    if (bridgeCallData.inputAssetIdB !== undefined) {
      const noteB = await this.core.pickNote(
        userId,
        bridgeCallData.inputAssetIdB,
        depositValue,
        userSpendingKeyRequired,
        excludePendingNotes,
      );
      if (noteB?.value === depositValue) {
        excludePendingNotes = excludePendingNotes || noteB.pending;
      } else {
        // Need to create chained txs to merge or split notes for assetB.
        const notes = await this.core.pickNotes(
          userId,
          bridgeCallData.inputAssetIdB,
          depositValue,
          userSpendingKeyRequired,
          excludePendingNotes,
        );
        excludePendingNotes = excludePendingNotes || notes.some(n => n.pending);

        const numTxs = !notes.length ? 0 : Math.max(1, notes.length - 1);
        // User does not have enough notes for assetB that sum to the required value. Return 0 fees.
        if (!numTxs) {
          return fees.map(fee => ({
            ...fee,
            value: BigInt(0),
          }));
        }

        // We are creating chained txs for assetB => need to find a note for assetA that has the exact value.
        if (feeAssetId !== assetId) {
          const noteA = await this.core.pickNote(
            userId,
            assetId,
            depositValue,
            userSpendingKeyRequired,
            excludePendingNotes,
          );
          // Return 0 fees if can't find a note for assetA with the exact value.
          if (noteA?.value !== depositValue) {
            return fees.map(fee => ({
              ...fee,
              value: BigInt(0),
            }));
          }
          const accFees = fees.map(fee => ({ ...fee, value: fee.value + transferFee.value * BigInt(numTxs) }));
          return await this.getChainedTxsFee(BigInt(0), accFees, transferFee, { ...options, excludePendingNotes });
        } else {
          return await Promise.all(
            fees.map(async fee => {
              const requiredFee = roundUp(fee.value + transferFee.value * BigInt(numTxs), feeSignificantFigures);
              const noteValueA = depositValue + requiredFee;
              const noteA = await this.core.pickNote(
                userId,
                assetId,
                noteValueA,
                userSpendingKeyRequired,
                excludePendingNotes,
              );
              // Return 0 fee if can't find a note for assetA with the exact value.
              return {
                ...fee,
                value: noteA?.value !== noteValueA ? BigInt(0) : requiredFee,
              };
            }),
          );
        }
      }
    }

    // Get the number of merges needed to create the exact note value for assetA.
    const getNumMerges = async (valueA: bigint) => {
      const notes = await this.core.pickNotes(userId, assetId, valueA, userSpendingKeyRequired, excludePendingNotes);
      if (!notes.length) {
        return;
      }
      if (bridgeCallData.numInputAssets === 2) {
        const note = await this.core.pickNote(userId, assetId, valueA, userSpendingKeyRequired, excludePendingNotes);
        if (note?.value === valueA) {
          return 0;
        } else {
          return Math.max(1, notes.length - 1);
        }
      } else {
        const totalNoteValue = notes.reduce((sum, n) => sum + n.value, BigInt(0));
        if (notes.length <= 2 && totalNoteValue === valueA) {
          return 0;
        } else {
          return Math.max(1, notes.length - 2);
        }
      }
    };

    if (feeAssetId !== assetId) {
      const numMerges = await getNumMerges(depositValue);
      if (numMerges === undefined) {
        return fees.map(fee => ({ ...fee, value: BigInt(0) }));
      }

      const accFees = fees.map(fee => ({ ...fee, value: fee.value + transferFee.value * BigInt(numMerges + 1) }));
      return await this.getChainedTxsFee(BigInt(0), accFees, transferFee, { ...options, excludePendingNotes });
    } else {
      const spendableValue = await this.core.getSpendableSum(
        userId,
        assetId,
        userSpendingKeyRequired,
        excludePendingNotes,
      );
      const getChainedTxsFee = async (baseFee: bigint) => {
        let totalValue = depositValue + roundUp(baseFee, feeSignificantFigures);
        let numMerges = 0;
        while (totalValue <= spendableValue) {
          const requiredNumMerges = (await getNumMerges(totalValue))!;
          if (requiredNumMerges <= numMerges) {
            return totalValue - depositValue;
          }
          numMerges = requiredNumMerges;
          totalValue = depositValue + roundUp(baseFee + transferFee.value * BigInt(numMerges), feeSignificantFigures);
        }
        // Need to deposit or transfer one more note with enough value.
        const numNotes =
          1 +
          (await this.core.pickNotes(userId, assetId, spendableValue, userSpendingKeyRequired, excludePendingNotes))
            .length;
        const expectedNumMerges = Math.max(0, numNotes - 2);
        return roundUp(baseFee + transferFee.value * BigInt(expectedNumMerges), feeSignificantFigures);
      };
      return await Promise.all(fees.map(async fee => ({ ...fee, value: await getChainedTxsFee(fee.value) })));
    }
  }

  public async getRegisterFees(
    assetId: number,
    options: { feeSignificantFigures?: number } = {},
  ): Promise<AssetValue[]> {
    return await this.getAccountFees(assetId, options);
  }

  public async getRecoverAccountFees(
    assetId: number,
    options: { feeSignificantFigures?: number } = {},
  ): Promise<AssetValue[]> {
    return await this.getAccountFees(assetId, options);
  }

  public async getAddSpendingKeyFees(assetId: number, options: GetFeesOptions = {}) {
    const txFees = await this.core.getTxFees(assetId);
    const fees = txFees[TxType.ACCOUNT];
    const [transferFee] = txFees[TxType.TRANSFER];
    const accFees = fees.map(fee => ({ ...fee, value: fee.value + transferFee.value }));
    return await this.getChainedTxsFee(BigInt(0), accFees, transferFee, options);
  }

  public async getMigrateAccountFees(assetId: number, options: { feeSignificantFigures?: number } = {}) {
    return await this.getAccountFees(assetId, options);
  }

  public async getProofDataFees(assetId: number, proofs: Buffer[], options: GetFeesOptions = {}) {
    const txFees = await this.core.getTxFees(assetId);
    const [transferFee] = txFees[TxType.TRANSFER];
    const defiFeesMap: Map<string, AssetValue[]> = new Map();
    const defiProofTxsFees: AssetValue[][] = [];
    const proofTxsFees: AssetValue[][] = [];
    for (const proofData of proofs) {
      const proofId = ProofData.getProofIdFromBuffer(proofData);
      switch (proofId) {
        case ProofId.DEPOSIT:
          proofTxsFees.push(txFees[TxType.DEPOSIT]);
          break;
        case ProofId.SEND:
          proofTxsFees.push(txFees[TxType.TRANSFER]);
          break;
        case ProofId.ACCOUNT:
          proofTxsFees.push(txFees[TxType.ACCOUNT]);
          break;
        case ProofId.WITHDRAW: {
          const { publicOwner } = new JoinSplitProofData(new ProofData(proofData));
          const txType =
            (await this.blockchain.isContract(publicOwner)) || (await this.blockchain.isEmpty(publicOwner))
              ? TxType.WITHDRAW_HIGH_GAS
              : TxType.WITHDRAW_TO_WALLET;
          proofTxsFees.push(txFees[txType]);
          break;
        }
        case ProofId.DEFI_DEPOSIT: {
          const { bridgeCallData } = new DefiDepositProofData(new ProofData(proofData));
          const bid = bridgeCallData.toString();
          const defiFees = defiFeesMap.get(bid) || (await this.core.getDefiFees(bridgeCallData));
          if (!defiFeesMap.has(bid)) {
            defiProofTxsFees.push([defiFees[0], defiFees[1], defiFees[1]]);
            defiFeesMap.set(bid, defiFees);
          } else {
            defiProofTxsFees.push([defiFees[0], defiFees[0], defiFees[0]]);
          }
        }
      }
    }
    const defiAccFees = defiProofTxsFees.reduce((accFees, fees, i) => (!i ? fees : accumeFees(accFees, fees)), []);
    // Always add a transfer fee for the fee paying tx.
    const feePayingTxFee = [...txFees[TxType.TRANSFER]];
    if (defiProofTxsFees.length) {
      feePayingTxFee.unshift(transferFee);
    }
    const accFees = [accumeFees(feePayingTxFee, defiAccFees), ...proofTxsFees].reduce(
      (accFees, fees, i) => (!i ? fees : accumeBaseFees(accFees, fees)),
      [],
    );

    return await this.getChainedTxsFee(BigInt(0), accFees, transferFee, options);
  }

  private async getTransactionFees(
    assetId: number,
    txType: TxType,
    options: GetFeesOptions & { assetValue?: AssetValue } = {},
  ): Promise<AssetValue[]> {
    const { userId, userSpendingKeyRequired, assetValue, excludePendingNotes } = options;
    const txFees = await this.core.getTxFees(assetId);
    const [transferFee] = txFees[TxType.TRANSFER];
    const fees = txFees[txType];
    const feeAssetId = fees[0].assetId;
    if (!assetValue?.value) {
      const accFees =
        feeAssetId === assetId ? fees : fees.map(fee => ({ ...fee, value: fee.value + transferFee.value }));
      return await this.getChainedTxsFee(BigInt(0), accFees, transferFee, options);
    }

    if (!userId) {
      throw new Error(`'userId' not provided.`);
    }

    const getNumNotes = async (privateInput: AssetValue) => {
      const notes = await this.core.pickNotes(
        userId,
        privateInput.assetId,
        privateInput.value,
        userSpendingKeyRequired,
        excludePendingNotes,
      );
      return notes.length;
    };

    const getNumMerges = async (privateInput: AssetValue) => {
      const numNotes = await getNumNotes(privateInput);
      return Math.max(0, numNotes - 2);
    };

    if (feeAssetId !== assetValue.assetId) {
      const numMerges = await getNumMerges(assetValue);
      const accFees = fees.map(fee => ({ ...fee, value: fee.value + transferFee.value * BigInt(numMerges + 1) }));
      return await this.getChainedTxsFee(BigInt(0), accFees, transferFee, options);
    } else {
      return await this.getChainedTxsFee(assetValue.value, fees, transferFee, options);
    }
  }

  private async getChainedTxsFee(
    baseValue: bigint,
    fees: AssetValue[],
    transferFee: AssetValue,
    options: GetFeesOptions,
  ) {
    const { assetId } = transferFee;
    const { userId, userSpendingKeyRequired, excludePendingNotes, feeSignificantFigures = 0 } = options;
    if (!userId) {
      return fees.map(fee => ({ ...fee, value: roundUp(fee.value, feeSignificantFigures) }));
    }

    const getNumNotes = async (value: bigint) => {
      const notes = await this.core.pickNotes(userId, assetId, value, userSpendingKeyRequired, excludePendingNotes);
      return notes.length;
    };

    const getNumMerges = async (value: bigint) => {
      const numNotes = await getNumNotes(value);
      return Math.max(0, numNotes - 2);
    };

    const spendableValue = await this.core.getSpendableSum(
      userId,
      assetId,
      userSpendingKeyRequired,
      excludePendingNotes,
    );

    const getTotalFee = async (baseFee: bigint) => {
      let totalValue = baseValue + roundUp(baseFee, feeSignificantFigures);
      let numMerges = 0;
      while (totalValue <= spendableValue) {
        const requiredNumMerges = await getNumMerges(totalValue);
        if (requiredNumMerges <= numMerges) {
          return totalValue - baseValue;
        }
        numMerges = requiredNumMerges;
        totalValue = baseValue + roundUp(baseFee + transferFee.value * BigInt(numMerges), feeSignificantFigures);
      }
      // Need to deposit or transfer one more note with enough value.
      const numNotes = 1 + (await getNumNotes(spendableValue));
      const expectedNumMerges = Math.max(0, numNotes - 2);
      return roundUp(baseFee + transferFee.value * BigInt(expectedNumMerges), feeSignificantFigures);
    };

    return await Promise.all(fees.map(async fee => ({ ...fee, value: await getTotalFee(fee.value) })));
  }

  private async getAccountFees(assetId: number, { feeSignificantFigures = 0 }) {
    const txFees = await this.core.getTxFees(assetId);
    const [depositFee] = txFees[TxType.DEPOSIT];
    return txFees[TxType.ACCOUNT].map(fee => ({
      ...fee,
      value: roundUp(fee.value + depositFee.value, feeSignificantFigures),
    }));
  }
}
