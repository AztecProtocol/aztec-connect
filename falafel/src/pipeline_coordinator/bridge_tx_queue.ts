import { AssetId } from '@aztec/barretenberg/asset';
import { BridgeId, BridgeConfig } from '@aztec/barretenberg/bridge_id';
import { DefiDepositProofData, ProofData } from '@aztec/barretenberg/client_proofs';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxDao } from '../entity/tx';
import { TxFeeResolver } from '../tx_fee_resolver';
import { BridgeCostResolver } from '../tx_fee_resolver/bridge_cost_resolver';
import { RollupTimeout } from './publish_time_manager';

export interface RollupTx {
  fee: bigint;
  feeAsset: AssetId;
  tx: TxDao;
  bridgeId?: BridgeId;
}

export function createRollupTx(rawTx: TxDao, proof: ProofData) {
  const rollupTx = {
    tx: rawTx,
    fee: toBigIntBE(proof.txFee),
    feeAsset: proof.txFeeAssetId.readUInt32BE(28),
    bridgeId: undefined,
  } as RollupTx;
  return rollupTx;
}

export function createDefiRollupTx(rawTx: TxDao, proof: DefiDepositProofData) {
  const rollupTx = {
    tx: rawTx,
    fee: proof.txFee,
    feeAsset: proof.txFeeAssetId,
    bridgeId: proof.bridgeId,
  } as RollupTx;
  return rollupTx;
}

export class BridgeTxQueue {
  // maintains an array of txs for this DefiBridge
  // we order by decreasing fee
  // this ensures that somebody paying the entire rollup cost (not just the bridge cost) will trigger a rollup
  private _txQueue: RollupTx[] = [];

  constructor(
    readonly _bridgeConfig: BridgeConfig,
    readonly _bridgeTimeout: RollupTimeout | undefined,
    readonly bridgeCostResolver: BridgeCostResolver,
  ) {}

  // add a new tx to the queue, order by decreasing fee
  public addDefiTx(newTx: RollupTx) {
    let index = this._txQueue.findIndex(tx => newTx.fee > tx.fee);
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
    assetIds: Set<AssetId>,
    maxAssets: number,
  ) {
    const txsToConsider: RollupTx[] = [];
    const newAssets = new Set<AssetId>(assetIds);
    let feeFromTxs = 0n;
    for (let i = 0; i < this._txQueue.length && txsToConsider.length < maxRemainingTransactions; i++) {
      const tx = this._txQueue[i];
      if (!newAssets.has(tx.feeAsset) && newAssets.size === maxAssets) {
        continue;
      }
      newAssets.add(tx.feeAsset);
      txsToConsider.push(tx);
      let contributionToBridgeCost = feeResolver.getGasPaidForByFee(tx.feeAsset, tx.fee);
      contributionToBridgeCost -= BigInt(feeResolver.getBaseTxGas());
      feeFromTxs += contributionToBridgeCost;
    }
    if (feeFromTxs >= this.bridgeCostResolver.getBridgeCost(this.bridgeConfig.bridgeId)) {
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
