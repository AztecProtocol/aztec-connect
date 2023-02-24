import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { NoteAlgorithms, recoverTreeNotes, TreeNote } from '@aztec/barretenberg/note_algorithms';
import { OffchainDefiDepositData, OffchainJoinSplitData } from '@aztec/barretenberg/offchain_tx_data';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { AuthAlgorithms } from '../auth_algorithms/index.js';

export interface DecryptedData {
  treeNotes: (TreeNote | undefined)[];
  treeNoteNullifiers: Buffer[];
  claimOutputNoteNullifiers: Buffer[];
  partialStateSecrets: Buffer[];
}
export interface DecryptedDataJson {
  treeNotes: (string | undefined)[];
  treeNoteNullifiers: string[];
  claimOutputNoteNullifiers: string[];
  partialStateSecrets: string[];
}

export function decryptedDataToJson(data: DecryptedData): DecryptedDataJson {
  return {
    treeNotes: data.treeNotes.map(note => (note ? note.toBuffer().toString('base64') : undefined)),
    treeNoteNullifiers: data.treeNoteNullifiers.map(nullifier => nullifier.toString('base64')),
    claimOutputNoteNullifiers: data.claimOutputNoteNullifiers.map(nullifier => nullifier.toString('base64')),
    partialStateSecrets: data.partialStateSecrets.map(secret => secret.toString('base64')),
  };
}

export function decryptedDataFromJson(data: DecryptedDataJson): DecryptedData {
  return {
    treeNotes: data.treeNotes.map(note => (note ? TreeNote.fromBuffer(Buffer.from(note, 'base64')) : undefined)),
    treeNoteNullifiers: data.treeNoteNullifiers.map(nullifier => Buffer.from(nullifier, 'base64')),
    claimOutputNoteNullifiers: data.claimOutputNoteNullifiers.map(nullifier => Buffer.from(nullifier, 'base64')),
    partialStateSecrets: data.partialStateSecrets.map(secret => Buffer.from(secret, 'base64')),
  };
}

export class BlockDecryptor {
  /**
   * Each payment proof adds 2 values (DecryptedNote or undefined).
   * Each defi deposit proof adds 1 value (DecryptedNote or undefined).
   */
  private async decryptOffchainTxData(authAlgos: AuthAlgorithms, proofIds: ProofId[], offchainTxData: Buffer[]) {
    const viewingKeys: Buffer[] = [];
    proofIds.forEach((proofId, i) => {
      switch (proofId) {
        case ProofId.DEPOSIT:
        case ProofId.WITHDRAW:
        case ProofId.SEND:
          viewingKeys.push(...OffchainJoinSplitData.getViewingKeyBuffers(offchainTxData[i]));
          break;
        case ProofId.DEFI_DEPOSIT:
          viewingKeys.push(OffchainDefiDepositData.getViewingKeyBuffer(offchainTxData[i]));
          break;
      }
    });
    const viewingKeysBuf = Buffer.concat(viewingKeys);
    return await authAlgos.decryptViewingKeys(viewingKeysBuf);
  }

  /**
   * Each payment proof adds 2 values (TreeNote or undefined) to treeNotes[].
   * Each defi deposit proof adds 1 value (TreeNote or undefined) to treeNotes[].
   * Each TreeNote in treeNotes[] adds a Buffer to treeNoteNullifiers[].
   * A defi deposit proof adds 1 Buffer to partialStateSecret[] if the corresponding value is defined in treeNotes[].
   * Each claim proof adds 2 Buffers to claimOutputNullifiers[].
   */
  public async decryptBlocks(
    accountPublicKey: GrumpkinAddress,
    authAlgos: AuthAlgorithms,
    noteAlgos: NoteAlgorithms,
    blocks: { rollup: RollupProofData; offchainTxData: Buffer[] }[],
  ): Promise<DecryptedData> {
    const innerProofs = blocks
      .map(b => b.rollup)
      .map(p => p.getNonPaddingProofs())
      .flat();
    const proofIds = innerProofs.map(p => p.proofId);
    const offchainTxDataBuffers = blocks.map(b => b.offchainTxData).flat();
    const noteCommitments: Buffer[] = [];
    const inputNullifiers: Buffer[] = [];
    innerProofs.forEach(proof => {
      switch (proof.proofId) {
        case ProofId.DEPOSIT:
        case ProofId.WITHDRAW:
        case ProofId.SEND: {
          noteCommitments.push(proof.noteCommitment1);
          noteCommitments.push(proof.noteCommitment2);
          inputNullifiers.push(proof.nullifier1);
          inputNullifiers.push(proof.nullifier2);
          break;
        }
        case ProofId.DEFI_DEPOSIT: {
          noteCommitments.push(proof.noteCommitment2);
          inputNullifiers.push(proof.nullifier2);
          break;
        }
      }
    });

    const decryptedNotes = await this.decryptOffchainTxData(authAlgos, proofIds, offchainTxDataBuffers);
    const treeNotes = recoverTreeNotes(decryptedNotes, inputNullifiers, noteCommitments, accountPublicKey, noteAlgos);

    const treeNoteNullifiers: Buffer[] = [];
    for (let i = 0; i < treeNotes.length; ++i) {
      if (!treeNotes[i]) {
        continue;
      }

      const nullifier = await authAlgos.computeValueNoteNullifier(noteCommitments[i]);
      treeNoteNullifiers.push(nullifier);
    }

    const partialStateSecrets: Buffer[] = [];
    const claimOutputNoteNullifiers: Buffer[] = [];
    let treeNoteStartIndex = 0;
    for (let i = 0; i < innerProofs.length; ++i) {
      const proof = innerProofs[i];
      switch (proof.proofId) {
        case ProofId.DEPOSIT:
        case ProofId.WITHDRAW:
        case ProofId.SEND:
          treeNoteStartIndex += 2;
          break;
        case ProofId.DEFI_DEPOSIT: {
          const changeNote = treeNotes[treeNoteStartIndex++];
          if (!changeNote) {
            continue;
          }

          const { partialStateSecretEphPubKey } = OffchainDefiDepositData.fromBuffer(offchainTxDataBuffers[i]);
          const partialStateSecret = await authAlgos.deriveNoteSecret(partialStateSecretEphPubKey);
          partialStateSecrets.push(partialStateSecret);
          break;
        }
        case ProofId.DEFI_CLAIM: {
          const nullifier1 = await authAlgos.computeValueNoteNullifier(proof.noteCommitment1);
          const nullifier2 = await authAlgos.computeValueNoteNullifier(proof.noteCommitment2);
          claimOutputNoteNullifiers.push(nullifier1);
          claimOutputNoteNullifiers.push(nullifier2);
          break;
        }
      }
    }

    return { treeNotes, treeNoteNullifiers, claimOutputNoteNullifiers, partialStateSecrets };
  }
}
