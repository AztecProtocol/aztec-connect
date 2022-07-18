import { TxFeeResolver } from '../tx_fee_resolver';
import { RollupTx } from './bridge_tx_queue';
import { isDefiDepositTx, numTxTypes } from '@aztec/barretenberg/blockchain';
import { ProofData } from '@aztec/barretenberg/client_proofs';

export interface BridgeProfile {
  bridgeId: bigint;
  numTxs: number;
  gasThreshold: number;
  gasAccrued: number;
  earliestTx: Date;
  latestTx: Date;
}

export interface RollupProfile {
  published: boolean;
  rollupSize: number;
  totalTxs: number;
  numTxsPerType: number[];
  gasBalance: number;
  totalGas: number;
  totalCallData: number;
  earliestTx: Date;
  latestTx: Date;
  innerChains: number;
  outerChains: number;
  bridgeProfiles: Map<bigint, BridgeProfile>;
}

export function emptyProfile(rollupSize: number) {
  const rp: RollupProfile = {
    published: false,
    rollupSize,
    totalTxs: 0,
    numTxsPerType: Array.from<number>({ length: numTxTypes }).fill(0),
    gasBalance: 0,
    totalCallData: 0,
    totalGas: 0,
    earliestTx: new Date(0),
    latestTx: new Date(0),
    innerChains: 0,
    outerChains: 0,
    bridgeProfiles: new Map(),
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
  rollupProfile.numTxsPerType = rollupProfile.numTxsPerType.map((_, i) =>
    allTxs.reduce((a, { tx }) => a + (tx.txType === i ? 1 : 0), 0),
  );
  const bridgeProfiles = new Map<bigint, BridgeProfile>();
  const commitmentLocations = new Map<string, number>();
  const emptyBuffer = Buffer.alloc(32);
  for (let txIndex = 0; txIndex < allTxs.length; txIndex++) {
    const tx = allTxs[txIndex];
    const proof = new ProofData(tx.tx.proofData);
    const assetId = proof.feeAssetId;
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
      rollupProfile.earliestTx = new Date(tx.tx.created);
      rollupProfile.latestTx = new Date(tx.tx.created);
    } else {
      if (tx.tx.created.getTime() < rollupProfile.earliestTx.getTime()) {
        rollupProfile.earliestTx = new Date(tx.tx.created);
      }
      if (tx.tx.created.getTime() > rollupProfile.latestTx.getTime()) {
        rollupProfile.latestTx = new Date(tx.tx.created);
      }
    }
    // here we use the unadjusted tx gas as we are trying to accumulate the real gas consumption of the rollup
    rollupProfile.totalGas += feeResolver.getUnadjustedTxGas(assetId, tx.tx.txType);
    rollupProfile.totalCallData += feeResolver.getTxCallData(tx.tx.txType);
    // each tx can have an adjusted amunt of gas due to call data limits etc.
    // we need to factor this in, it effectively pays for additional rollup slots
    const txGasAdjustment =
      feeResolver.getAdjustedTxGas(assetId, tx.tx.txType) - feeResolver.getUnadjustedTxGas(assetId, tx.tx.txType);
    rollupProfile.gasBalance += txGasAdjustment;
    if (!isDefiDepositTx(tx.tx.txType)) {
      // for non-defi txs, we add on any excess
      rollupProfile.gasBalance += tx.excessGas;
    } else if (!tx.bridgeId) {
      console.log(`Invalid bridge id encountered on DEFI transaction!`);
    } else {
      const bridgeId = tx.bridgeId;
      let bridgeProfile = bridgeProfiles.get(bridgeId);
      if (!bridgeProfile) {
        // thie bridge gas cost needs to include subsidy as it is used to determine profitability
        const bridgeGasCost = feeResolver.getFullBridgeGas(tx.bridgeId);
        bridgeProfile = {
          bridgeId,
          numTxs: 0,
          gasThreshold: bridgeGasCost,
          gasAccrued: 0,
          earliestTx: new Date(tx.tx.created),
          latestTx: new Date(tx.tx.created),
        };
        bridgeProfiles.set(bridgeId, bridgeProfile);
        // we are going to incur the cost of the bridge here so reduce our gas balance
        rollupProfile.gasBalance -= bridgeGasCost;
        // we need to add the total un-subsidised bridge gas cost to the total gas
        rollupProfile.totalGas += feeResolver.getFullBridgeGasFromContract(tx.bridgeId);
      }
      bridgeProfile.numTxs++;
      // this is the gas provided above and beyond the gas constant for defi deposits
      const gasTowardsBridge = feeResolver.getSingleBridgeTxGas(tx.bridgeId) + tx.excessGas;
      bridgeProfile.gasAccrued += gasTowardsBridge;
      // add this back onto the gas balance for the rollup
      rollupProfile.gasBalance += gasTowardsBridge;

      if (bridgeProfile.earliestTx.getTime() > tx.tx.created.getTime()) {
        bridgeProfile.earliestTx = new Date(tx.tx.created);
      }
      if (bridgeProfile.latestTx.getTime() < tx.tx.created.getTime()) {
        bridgeProfile.latestTx = new Date(tx.tx.created);
      }
    }
  }
  rollupProfile.bridgeProfiles = bridgeProfiles;
  const numEmptySlots = rollupSize - allTxs.length;

  // now we have accounted for all transactions in this rollup, it's just the empty slots
  const gasForEmptySlots = numEmptySlots * feeResolver.getUnadjustedBaseVerificationGas();
  rollupProfile.gasBalance -= gasForEmptySlots;
  rollupProfile.totalGas += gasForEmptySlots;
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
