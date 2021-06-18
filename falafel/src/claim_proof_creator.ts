import { TxType } from '@aztec/barretenberg/blockchain';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import { DefiInteractionNote, TreeClaimNote } from '@aztec/barretenberg/note_algorithms';
import { DefiDepositProofData, InnerProofData } from '@aztec/barretenberg/rollup_proof';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
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
    const claims = await this.rollupDb.getPendingClaims(numTxs);
    if (!claims.length) {
      return;
    }

    const txIds = claims.map(c => c.txId);
    const txs = await this.rollupDb.getTxsByTxIds(txIds);
    const dataRoot = this.worldStateDb.getRoot(RollupTreeId.DATA);
    const defiRoot = this.worldStateDb.getRoot(RollupTreeId.DEFI);

    for (const claim of claims) {
      const tx = txs.find(t => t.id.equals(claim.txId))!;
      const proofData = await this.createClaimProof(dataRoot, defiRoot, claim, tx);
      if (!proofData) {
        // TODO: Once we correctly handle interrupts, this is not a panic scenario.
        throw new Error('Failed to create claim proof. This should not happen.');
      }

      const proof = new ProofData(proofData);
      const dataRootsIndex = await this.rollupDb.getDataRootsIndex(proof.noteTreeRoot);
      const claimTx = new TxDao({
        id: proof.txId,
        txType: TxType.DEFI_CLAIM,
        proofData,
        nullifier1: proof.nullifier1,
        viewingKey1: ViewingKey.EMPTY,
        viewingKey2: ViewingKey.EMPTY,
        dataRootsIndex,
        created: new Date(),
      });
      await this.rollupDb.addTx(claimTx);
    }
  }

  interrupt() {
    // TODO: Interrupt proof creation.
  }

  private async createClaimProof(dataRoot: Buffer, defiRoot: Buffer, claim: ClaimDao, tx: TxDao) {
    const { id, txId, interactionNonce } = claim;
    console.log(`Creating claim proof for tx ${txId.toString('hex')}...`);
    const interactionNote = parseInteractionResult(tx.rollupProof!.rollup.interactionResult).find(
      n => n.nonce === interactionNonce,
    )!;
    const claimNoteIndex = id;
    const claimNotePath = await this.worldStateDb.getHashPath(RollupTreeId.DATA, BigInt(claimNoteIndex));
    const proofData = new DefiDepositProofData(InnerProofData.fromBuffer(tx.proofData));
    const claimNote = new TreeClaimNote(
      proofData.depositValue,
      proofData.bridgeId,
      interactionNonce,
      proofData.partialState,
    );
    const interactionNotePath = await this.worldStateDb.getHashPath(RollupTreeId.DEFI, BigInt(interactionNonce));
    const { outputValueA, outputValueB } = this.getOutputValues(claimNote, interactionNote);
    const claimProof = new ClaimProof(
      dataRoot,
      defiRoot,
      claimNoteIndex,
      claimNotePath,
      claimNote,
      interactionNotePath,
      interactionNote,
      outputValueA,
      outputValueB,
    );
    const request = new ClaimProofRequest(claimProof);
    const proof = await this.proofGenerator.createProof(request.toBuffer());
    console.log(`Proof received: ${proof.length}`);
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
