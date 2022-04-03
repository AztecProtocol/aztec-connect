import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import { DefiInteractionNote, TreeClaimNote } from '@aztec/barretenberg/note_algorithms';
import { OffchainDefiClaimData } from '@aztec/barretenberg/offchain_tx_data';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { RollupTreeId, WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { ClaimProof, ClaimProofRequest, ProofGenerator } from 'halloumi/proof_generator';
import { ClaimDao } from './entity/claim';
import { TxDao } from './entity/tx';
import { RollupDb } from './rollup_db';
import { parseInteractionResult } from './rollup_db/parse_interaction_result';

export class ClaimProofCreator {
  constructor(private rollupDb: RollupDb, private worldStateDb: WorldStateDb, private proofGenerator: ProofGenerator) {}

  /**
   * Creates claim proofs for the defi deposit txs with the interaction result from previous rollups.
   */
  async create(numTxs: number) {
    const claims = await this.rollupDb.getClaimsToRollup(numTxs);
    if (!claims.length) {
      return;
    }

    const dataRoot = this.worldStateDb.getRoot(RollupTreeId.DATA);
    const defiRoot = this.worldStateDb.getRoot(RollupTreeId.DEFI);

    const rollupIds: Set<number> = new Set();
    for (const claim of claims) {
      const { interactionResultRollupId } = claim;
      if (interactionResultRollupId === undefined) {
        continue;
      }
      rollupIds.add(interactionResultRollupId);
    }
    const rollups = await this.rollupDb.getRollupsByRollupIds([...rollupIds]);

    for (const claim of claims) {
      const rollupForThisClaimsDefiInteraction = rollups.find(rollup => rollup.id === claim.interactionResultRollupId)!;
      const interactionNotesForRollup = parseInteractionResult(rollupForThisClaimsDefiInteraction.interactionResult!);
      const noteIndex = interactionNotesForRollup.findIndex(itx => itx.nonce === claim.interactionNonce);
      const interactionNoteForThisClaim = interactionNotesForRollup[noteIndex];
      // rollupForThisClaim is the rollup that produced the defi interaction notes
      // the rollup id we need is the one following, which is when the notes were entered into the defi tree
      const interactionIndex =
        (rollupForThisClaimsDefiInteraction.id + 1) * RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK + noteIndex;
      const proofData = await this.createClaimProof(
        dataRoot,
        defiRoot,
        claim,
        interactionNoteForThisClaim,
        interactionIndex,
      );
      if (!proofData) {
        // TODO: Once we correctly handle interrupts, this is not a panic scenario.
        throw new Error('Failed to create claim proof. This should not happen.');
      }

      const proof = new ProofData(proofData);
      const dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);
      const offchainTxData = new OffchainDefiClaimData();
      const claimTx = new TxDao({
        id: proof.txId,
        txType: TxType.DEFI_CLAIM,
        proofData,
        offchainTxData: offchainTxData.toBuffer(),
        nullifier1: proof.nullifier1,
        nullifier2: proof.nullifier2,
        dataRootsIndex,
        created: new Date(),
        excessGas: 0n,
      });
      await this.rollupDb.addTx(claimTx);
    }
  }

  interrupt() {
    // TODO: Interrupt proof creation.
  }

  private async createClaimProof(
    dataRoot: Buffer,
    defiRoot: Buffer,
    claim: ClaimDao,
    interactionNote: DefiInteractionNote,
    interactionNoteIndex: number,
  ) {
    const { id, depositValue, bridgeId, partialState, inputNullifier, interactionNonce, fee } = claim;
    console.log(`Creating claim proof for note ${id} using interaction with nonce ${interactionNonce}...`);
    const claimNoteIndex = id;
    const claimNotePath = await this.worldStateDb.getHashPath(RollupTreeId.DATA, BigInt(claimNoteIndex));
    const claimNote = new TreeClaimNote(
      depositValue,
      BridgeId.fromBigInt(bridgeId),
      interactionNonce,
      fee,
      partialState,
      inputNullifier,
    );
    const interactionNotePath = await this.worldStateDb.getHashPath(RollupTreeId.DEFI, BigInt(interactionNoteIndex));
    const { outputValueA, outputValueB } = this.getOutputValues(claimNote, interactionNote);

    const claimProof = new ClaimProof(
      dataRoot,
      defiRoot,
      claimNoteIndex,
      claimNotePath,
      claimNote,
      interactionNoteIndex,
      interactionNotePath,
      interactionNote,
      outputValueA,
      outputValueB,
    );
    const request = new ClaimProofRequest(claimProof);
    const proof = await this.proofGenerator.createProof(request.toBuffer());
    console.log(`Claim proof received: ${proof.length} bytes`);
    return proof;
  }

  private getOutputValues(claimNote: TreeClaimNote, interactionNote: DefiInteractionNote) {
    const { totalInputValue, totalOutputValueA, totalOutputValueB, result } = interactionNote;
    const { value } = claimNote;
    const outputValueA = !result ? 0n : (totalOutputValueA * value) / totalInputValue;
    const outputValueB = !result ? 0n : (totalOutputValueB * value) / totalInputValue;
    return { outputValueA, outputValueB };
  }
}
