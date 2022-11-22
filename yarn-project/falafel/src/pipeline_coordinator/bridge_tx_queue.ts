import { AssetValue } from '@aztec/barretenberg/asset';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { DefiDepositProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { BridgeSubsidyProvider } from '../bridge/bridge_subsidy_provider.js';
import { TxDao } from '../entity/index.js';
import { TxFeeResolver } from '../tx_fee_resolver/index.js';

export interface RollupTx {
  excessGas: number;
  fee: AssetValue;
  tx: TxDao;
  bridgeCallData?: bigint;
  secondClass?: boolean;
}

export interface RollupResources {
  gasUsed: number;
  callDataUsed: number;
  bridgeCallDatas: bigint[];
  assetIds: Set<number>;
}

export function createRollupTx(rawTx: TxDao, proof: ProofData): RollupTx {
  return {
    tx: rawTx,
    excessGas: rawTx.excessGas,
    fee: {
      assetId: proof.feeAssetId,
      value: toBigIntBE(proof.txFee),
    },
    bridgeCallData: undefined,
    secondClass: rawTx.secondClass,
  };
}

export function createDefiRollupTx(rawTx: TxDao, proof: DefiDepositProofData): RollupTx {
  return {
    tx: rawTx,
    excessGas: rawTx.excessGas,
    fee: {
      assetId: proof.txFeeAssetId,
      value: proof.txFee,
    },
    bridgeCallData: proof.bridgeCallData.toBigInt(),
    secondClass: rawTx.secondClass,
  };
}

export interface BridgeQueueResult {
  txsToRollup: RollupTx[];
  resourcesConsumed: RollupResources;
}

export interface BridgeQueueStats {
  numQueuedTxs: number;
  gasAccrued: number;
  bridgeCallData: bigint;
}

export class BridgeTxQueue {
  // maintains an array of txs for this DefiBridge
  // we order by decreasing fee
  // this ensures that somebody paying the entire rollup cost (not just the bridge cost) will trigger a rollup
  private txQueue: RollupTx[] = [];

  constructor(
    private readonly bridgeCallData: bigint,
    private readonly feeResolver: TxFeeResolver,
    private readonly bridgeSubsidyProvider: BridgeSubsidyProvider,
    private log = console.log,
  ) {}

  public getQueueStats() {
    const gasAccrued = this.txQueue.reduce((prev, currentTx) => {
      const newGas = this.feeResolver.getSingleBridgeTxGas(this.bridgeCallData) + currentTx.excessGas;
      return prev + newGas;
    }, 0);
    return {
      numQueuedTxs: this.txQueue.length,
      gasAccrued,
      bridgeCallData: this.bridgeCallData,
    } as BridgeQueueStats;
  }

  // add a new tx to the queue, order by decreasing fee
  public addDefiTx(newTx: RollupTx) {
    let index = this.txQueue.findIndex(tx => newTx.excessGas > tx.excessGas);
    if (index === -1) {
      index = this.txQueue.length;
    }
    this.txQueue.splice(index, 0, newTx);
  }

  // we need to traverse our queue of txs and attempt to complete a defi batch
  // completing a batch means producing a set of txs that make the batch profitable whilst still keeping within bridge size and rollup size
  public async getTxsToRollup(
    maxRemainingTransactions: number,
    assetIds: Set<number>,
    maxAssets: number,
    gasRemainingInRollup: number,
    callDataRemainingInRollup: number,
  ) {
    const txsToConsider: RollupTx[] = [];
    const newAssets = new Set<number>(assetIds);
    const callDataPerTx = this.feeResolver.getTxCallData(TxType.DEFI_DEPOSIT);
    let gasFromTxs = 0;
    // this figure holds the total gas used by the selected txs, including the verification gas, the defi deposit gas and the bridge interaction gas
    // start off with the bridge interaction gas and add on the gas for each tx
    // we need to get the bridge gas usage from the contract as this is not overridden by subsidy
    let totalGasUsedByTxs = this.feeResolver.getFullBridgeGasFromContract(this.bridgeCallData);
    // this full bridge gas is used to determine profitability so we need the value that includes subsidy
    const fullGasCostOfBridgeInteraction = this.feeResolver.getFullBridgeGas(this.bridgeCallData);
    // this figure holds the total calldata used by the selected txs
    let totalCallDataUsedByTxs = 0;
    for (let i = 0; i < this.txQueue.length && txsToConsider.length < maxRemainingTransactions; i++) {
      const tx = this.txQueue[i];
      const gasUsedByTx =
        this.feeResolver.getUnadjustedTxGas(tx.fee.assetId, TxType.DEFI_DEPOSIT) -
        this.feeResolver.getUnadjustedBaseVerificationGas();
      const newGasUsedValue = totalGasUsedByTxs + gasUsedByTx;
      const newCallDataUsed = totalCallDataUsedByTxs + callDataPerTx;
      if (newGasUsedValue > gasRemainingInRollup || newCallDataUsed > callDataRemainingInRollup) {
        // we can no longer accept more txs at this point
        break;
      }
      if (tx.fee.value && this.feeResolver.isFeePayingAsset(tx.fee.assetId)) {
        if (!newAssets.has(tx.fee.assetId) && newAssets.size === maxAssets) {
          continue;
        }
        newAssets.add(tx.fee.assetId);
      }
      txsToConsider.push(tx);
      // here we accumulate the amount of gas on the tx that is attributable to the bridge
      // i.e. we are not counting the gas that would be used by the verifier etc.
      // all we are trying to test here is 'do we have enough gas to run the bridge interaction'
      const gasAttributableToBridge = this.feeResolver.getSingleBridgeTxGas(this.bridgeCallData) + tx.excessGas;
      gasFromTxs += Math.min(gasAttributableToBridge, fullGasCostOfBridgeInteraction);
      totalGasUsedByTxs = newGasUsedValue;
      totalCallDataUsedByTxs = newCallDataUsed;
    }

    // get the available subsidy
    const availableSubsidy = await this.bridgeSubsidyProvider.getBridgeSubsidy(this.bridgeCallData);
    const totalGasFromTxsAndSubsidy = gasFromTxs + availableSubsidy;
    if (txsToConsider.length && totalGasFromTxsAndSubsidy >= fullGasCostOfBridgeInteraction) {
      this.txQueue.splice(0, txsToConsider.length);
      // claim the subsidy for this bridge call data
      const claimed = this.bridgeSubsidyProvider.claimBridgeSubsidy(this.bridgeCallData);
      if (availableSubsidy > 0 && !claimed) {
        this.log(
          `Failed to claim expected subsidy of ${availableSubsidy} for bridge call data ${BridgeCallData.fromBigInt(
            this.bridgeCallData,
          ).toString()}`,
        );
      }
      return {
        txsToRollup: txsToConsider,
        resourcesConsumed: {
          gasUsed: totalGasUsedByTxs,
          callDataUsed: totalCallDataUsedByTxs,
          assetIds: newAssets,
          bridgeCallDatas: [this.bridgeCallData],
        },
      } as BridgeQueueResult;
    }
    return {
      txsToRollup: [],
      resourcesConsumed: {
        gasUsed: 0,
        callDataUsed: 0,
        assetIds: new Set<number>(),
        bridgeCallDatas: [],
      },
    } as BridgeQueueResult;
  }
}
