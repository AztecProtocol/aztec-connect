import { BridgeConfig } from '@aztec/barretenberg/bridge_id';
import { DefiDepositProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { TxDao } from '../entity/tx';
import { TxFeeResolver } from '../tx_fee_resolver';
import { RollupTimeout } from './publish_time_manager';

export interface RollupTx {
  excessGas: bigint;
  feeAsset: number;
  tx: TxDao;
  bridgeId?: bigint;
}

export function createRollupTx(rawTx: TxDao, proof: ProofData) {
  const rollupTx = {
    tx: rawTx,
    excessGas: rawTx.excessGas,
    feeAsset: proof.txFeeAssetId.readUInt32BE(28),
    bridgeId: undefined,
  } as RollupTx;
  return rollupTx;
}

export function createDefiRollupTx(rawTx: TxDao, proof: DefiDepositProofData) {
  const rollupTx = {
    tx: rawTx,
    excessGas: rawTx.excessGas,
    feeAsset: proof.txFeeAssetId,
    bridgeId: proof.bridgeId.toBigInt(),
  } as RollupTx;
  return rollupTx;
}

export class BridgeTxQueue {
  // maintains an array of txs for this DefiBridge
  // we order by decreasing fee
  // this ensures that somebody paying the entire rollup cost (not just the bridge cost) will trigger a rollup
  private _txQueue: RollupTx[] = [];

  constructor(readonly _bridgeConfig: BridgeConfig, readonly _bridgeTimeout: RollupTimeout | undefined) {}

  // add a new tx to the queue, order by decreasing fee
  public addDefiTx(newTx: RollupTx) {
    let index = this._txQueue.findIndex(tx => newTx.excessGas > tx.excessGas);
    if (index === -1) {
      index = this._txQueue.length;
    }
    this._txQueue.splice(index, 0, newTx);
  }

  // we need to traverse our queue of txs and attempt to complete a defi batch
  // completing a batch means producing a set of txs that make the batch profitable whilst still keeping within bridge size and rollup size
  public getTxsToRollup(
    feeResolver: TxFeeResolver,
    maxRemainingTransactions: number,
    assetIds: Set<number>,
    maxAssets: number,
  ) {
    const txsToConsider: RollupTx[] = [];
    const newAssets = new Set<number>(assetIds);
    let gasFromTxs = 0n;
    for (let i = 0; i < this._txQueue.length && txsToConsider.length < maxRemainingTransactions; i++) {
      const tx = this._txQueue[i];
      if (feeResolver.isFeePayingAsset(tx.feeAsset)) {
        if (!newAssets.has(tx.feeAsset) && newAssets.size === maxAssets) {
          continue;
        }
        newAssets.add(tx.feeAsset);
      }
      txsToConsider.push(tx);
      gasFromTxs += feeResolver.getSingleBridgeTxGas(this.bridgeId) + tx.excessGas;
    }
    const fullBridgeGas = feeResolver.getFullBridgeGas(this.bridgeId);
    if (gasFromTxs >= fullBridgeGas) {
      this._txQueue.splice(0, txsToConsider.length);
      for (const asset of newAssets) {
        assetIds.add(asset);
      }
      return txsToConsider;
    }
    return [];
  }

  get bridgeId() {
    return this.bridgeConfig.bridgeId;
  }

  get bridgeConfig() {
    return this._bridgeConfig;
  }

  public transactionHasTimedOut(tx: RollupTx) {
    if (!this._bridgeTimeout?.timeout) {
      return false;
    }
    return tx.tx.created.getTime() < this._bridgeTimeout.timeout.getTime();
  }
}
