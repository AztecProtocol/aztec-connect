import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { createJoinSplitProofSigningData } from '@aztec/barretenberg/client_proofs';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import {
  batchDecryptNotes,
  deriveNoteSecret,
  NoteAlgorithms,
  NoteDecryptor,
} from '@aztec/barretenberg/note_algorithms';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { KeyPair } from '../key_pair/index.js';
import { JoinSplitTxInput, toJoinSplitTx } from '../proofs/proof_input/index.js';
import { AuthAlgorithms } from './auth_algorithms.js';

export class KeyPairAuthAlgorithms implements AuthAlgorithms {
  constructor(
    private keyPair: KeyPair,
    private grumpkin: Grumpkin,
    private noteAlgos: NoteAlgorithms,
    private noteDecryptor: NoteDecryptor,
    private wasm: BarretenbergWasm,
  ) {}

  public async computeValueNoteNullifier(commitment: Buffer, gibberish = false) {
    const accountPrivateKey = await this.keyPair.getPrivateKey();
    return this.noteAlgos.valueNoteNullifier(commitment, accountPrivateKey, !gibberish);
  }

  public async deriveNoteSecret(ecdhPubKey: GrumpkinAddress) {
    const accountPrivateKey = await this.keyPair.getPrivateKey();
    return deriveNoteSecret(ecdhPubKey, accountPrivateKey, this.grumpkin);
  }

  public async decryptViewingKeys(viewingKeysBuf: Buffer) {
    const accountPrivateKey = await this.keyPair.getPrivateKey();
    return await batchDecryptNotes(viewingKeysBuf, accountPrivateKey, this.noteDecryptor, this.grumpkin);
  }

  public async createJoinSplitProofSigningData(tx: JoinSplitTxInput) {
    const accountPrivateKey = await this.keyPair.getPrivateKey();
    return await createJoinSplitProofSigningData(toJoinSplitTx(tx, accountPrivateKey), this.wasm);
  }
}
