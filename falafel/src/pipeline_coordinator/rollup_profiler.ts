import { BridgeId, BridgeConfig } from '@aztec/barretenberg/bridge_id';
import { TxFeeResolver } from '../tx_fee_resolver';
import { RollupTx } from './bridge_tx_queue';
import { isDefiDeposit } from '@aztec/barretenberg/blockchain';
import { BridgeCostResolver } from '../tx_fee_resolver/bridge_cost_resolver';
import { ProofData } from '@aztec/barretenberg/client_proofs';

export interface BridgeProfile {
  bridgeId: BridgeId;
  numTxs: number;
  totalGasCost: bigint;
  totalGasEarnt: bigint;
  earliestTx: Date;
  latestTx: Date;
}

export interface RollupProfile {
  published: boolean;
  rollupSize: number;
  totalTxs: number;
  totalGasCost: bigint;
  totalGasEarnt: bigint;
  earliestTx: Date;
  latestTx: Date;
  innerChains: number;
  outerChains: number;
  bridgeProfiles: BridgeProfile[];
}

export function emptyProfile(rollupSize: number) {
  const rp: RollupProfile = {
    published: false,
    rollupSize,
    totalTxs: 0,
    totalGasCost: 0n,
    totalGasEarnt: 0n,
    earliestTx: new Date(0),
    latestTx: new Date(0),
    innerChains: 0,
    outerChains: 0,
    bridgeProfiles: [],
  };
  return rp;
}

export function profileRollup(
  allTxs: RollupTx[],
  feeResolver: TxFeeResolver,
  innerRollupSize: number,
  rollupSize: number,
  bridgeCostResolver: BridgeCostResolver,
) {
  const rollupProfile: RollupProfile = emptyProfile(rollupSize);
  rollupProfile.totalTxs = allTxs.length;
  const bridgeProfiles = new Map<string, BridgeProfile>();
  const commitmentLocations = new Map<string, number>();
  const emptyBuffer = Buffer.alloc(32);
  for (let txIndex = 0; txIndex < allTxs.length; txIndex++) {
    const tx = allTxs[txIndex];
    const proof = new ProofData(tx.tx.proofData);
    const currentInner = Math.trunc(txIndex / innerRollupSize);
    const noteStrings = [proof.noteCommitment1, proof.noteCommitment2].filter(n => !n.equals(emptyBuffer)).map(n => n.toString('hex'));
    for (const noteString of noteStrings) {
      commitmentLocations.set(noteString, currentInner);
    }
    if (!proof.backwardLink.equals(emptyBuffer)) {
      const link = commitmentLocations.get(proof.backwardLink.toString('hex'));
      if (link !== undefined) {
        if (link === currentInner) {
          rollupProfile.innerChains++;
        } else {
          rollupProfile.outerChains++;
        }
      }
    }
    if (!txIndex) {
      rollupProfile.earliestTx = tx.tx.created;
      rollupProfile.latestTx = tx.tx.created;
    } else {
      if (tx.tx.created.getTime() < rollupProfile.earliestTx.getTime()) {
        rollupProfile.earliestTx = tx.tx.created;
      }
      if (tx.tx.created.getTime() > rollupProfile.latestTx.getTime()) {
        rollupProfile.latestTx = tx.tx.created;
      }
    }
    rollupProfile.totalGasEarnt += feeResolver.getGasPaidForByFee(tx.feeAsset, tx.fee);
    if (!isDefiDeposit(tx.tx.txType)) {
      // for non-defi txs, this gives base cost + tx cost
      rollupProfile.totalGasCost += feeResolver.getTxGas(tx.feeAsset, tx.tx.txType);
    } else if (!tx.bridgeId) {
      console.log(`Invalid bridge id encountered on DEFI transaction!!`);
    } else {
      // for defi txs, this just gives base cost. tx cost is calculated further down
      const baseGas = BigInt(feeResolver.getBaseTxGas());
      rollupProfile.totalGasCost += baseGas;

      const bridgeId = tx.bridgeId.toString();
      let profile = bridgeProfiles.get(bridgeId);
      if (!profile) {
        const bridgeGasCost = bridgeCostResolver.getBridgeCost(tx.bridgeId);
        profile = {
          bridgeId: tx.bridgeId,
          numTxs: 0,
          totalGasCost: bridgeGasCost,
          totalGasEarnt: 0n,
          earliestTx: tx.tx.created,
          latestTx: tx.tx.created,
        };
        bridgeProfiles.set(bridgeId, profile);
        rollupProfile.totalGasCost += bridgeGasCost;
      }
      profile.numTxs++;
      profile.totalGasEarnt += feeResolver.getGasPaidForByFee(tx.feeAsset, tx.fee);
      profile.totalGasCost += baseGas;
      if (profile.earliestTx > tx.tx.created) {
        profile.earliestTx = tx.tx.created;
      }
      if (profile.latestTx < tx.tx.created) {
        profile.latestTx = tx.tx.created;
      }
    }
  }
  rollupProfile.bridgeProfiles = [...bridgeProfiles.values()];
  const numEmptySlots = rollupSize - allTxs.length;
  // now we have accounted for all transactions in this rollup, it's just the empty slots
  rollupProfile.totalGasCost += BigInt(numEmptySlots) * BigInt(feeResolver.getBaseTxGas());
  return rollupProfile;
}
