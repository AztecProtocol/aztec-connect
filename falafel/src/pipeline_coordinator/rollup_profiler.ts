import { TxFeeResolver } from '../tx_fee_resolver';
import { RollupTx } from './bridge_tx_queue';
import { isDefiDeposit } from '@aztec/barretenberg/blockchain';
import { ProofData } from '@aztec/barretenberg/client_proofs';

export interface BridgeProfile {
  bridgeId: bigint;
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
  gasBalance: bigint;
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
    gasBalance: 0n,
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
) {
  const rollupProfile: RollupProfile = emptyProfile(rollupSize);
  rollupProfile.totalTxs = allTxs.length;
  const bridgeProfiles = new Map<bigint, BridgeProfile>();
  const commitmentLocations = new Map<string, number>();
  const emptyBuffer = Buffer.alloc(32);
  for (let txIndex = 0; txIndex < allTxs.length; txIndex++) {
    const tx = allTxs[txIndex];
    const proof = new ProofData(tx.tx.proofData);
    const currentInner = Math.trunc(txIndex / innerRollupSize);
    const noteStrings = [proof.noteCommitment1, proof.noteCommitment2]
      .filter(n => !n.equals(emptyBuffer))
      .map(n => n.toString('hex'));
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
    if (!isDefiDeposit(tx.tx.txType)) {
      // for non-defi txs, we add on any gas above and beyond that required for the tx (call data etc)
      rollupProfile.gasBalance += tx.excessGas;
    } else if (!tx.bridgeId) {
      console.log(`Invalid bridge id encountered on DEFI transaction!`);
    } else {
      const bridgeId = tx.bridgeId;
      let bridgeProfile = bridgeProfiles.get(bridgeId);
      if (!bridgeProfile) {
        const bridgeGasCost = feeResolver.getFullBridgeGas(tx.bridgeId);
        bridgeProfile = {
          bridgeId,
          numTxs: 0,
          totalGasCost: bridgeGasCost,
          totalGasEarnt: 0n,
          earliestTx: tx.tx.created,
          latestTx: tx.tx.created,
        };
        bridgeProfiles.set(bridgeId, bridgeProfile);
        // we are going to incur the cost of the bridge here so reduce our gas balance
        rollupProfile.gasBalance -= bridgeGasCost;
      }
      bridgeProfile.numTxs++;
      // this is the gas provided above and beyond the gas constant for defi deposits
      const gasTowardsBridge = feeResolver.getSingleBridgeTxGas(tx.bridgeId) + tx.excessGas;
      bridgeProfile.totalGasEarnt += gasTowardsBridge;
      // add this back onto the gas balance for the rollup
      rollupProfile.gasBalance += gasTowardsBridge;
      if (bridgeProfile.earliestTx > tx.tx.created) {
        bridgeProfile.earliestTx = tx.tx.created;
      }
      if (bridgeProfile.latestTx < tx.tx.created) {
        bridgeProfile.latestTx = tx.tx.created;
      }
    }
  }
  rollupProfile.bridgeProfiles = [...bridgeProfiles.values()];
  const numEmptySlots = rollupSize - allTxs.length;
  // now we have accounted for all transactions in this rollup, it's just the empty slots
  rollupProfile.gasBalance -= BigInt(numEmptySlots) * BigInt(feeResolver.getBaseTxGas());
  // if we define the following values:
  // B = bridge cost
  // V = verification cost
  // dB = single share of bridge cost
  // dV = single share of verification cost
  // gasBalance now equals:
  // (for all bridges(sumOfTxsForBridge(dB + excess provided)) + sumOfNonBridgeTxs(excess provided)) - (cost of all bridges + numEmptySlots * dV)
  // if gasBalance >= 0 then we are profitable
  return rollupProfile;
}
