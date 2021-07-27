import { toBufferBE } from '../bigint_buffer';
import { randomBytes } from 'crypto';
import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { BridgeId } from '../bridge_id';
import { ProofId } from '../client_proofs';
import { Grumpkin } from '../ecc/grumpkin';
import { NoteAlgorithms } from '../note_algorithms';
import { InnerProofData } from '../rollup_proof';
import { ViewingKey } from '../viewing_key';
import { BarretenbergWasm } from '../wasm';
import { batchDecryptNotes } from './batch_decrypt_notes';
import { ClaimNoteTxData } from './claim_note_tx_data';
import { recoverTreeClaimNotes } from './recover_tree_claim_notes';
import { TreeClaimNote } from './tree_claim_note';
import { TreeNote } from './tree_note';

describe('tree_claim_note', () => {
  let grumpkin: Grumpkin;
  let noteAlgos!: NoteAlgorithms;

  const createKeyPair = () => {
    const privKey = grumpkin.getRandomFr();
    const pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privKey));
    return { privKey, pubKey };
  };

  const createClaimNote = (value: bigint, bridgeId: BridgeId, ownerPubKey: GrumpkinAddress, ephPrivKey: Buffer) => {
    const ownerId = new AccountId(ownerPubKey, 0);
    const txData = ClaimNoteTxData.createFromEphPriv(value, bridgeId, ownerId, ephPrivKey, grumpkin);
    const partialState = noteAlgos.valueNotePartialCommitment(txData.noteSecret, ownerId);
    return {
      claimNote: new TreeClaimNote(value, bridgeId, 0, BigInt(0), partialState),
      viewingKey: txData.getViewingKey(ownerPubKey, ephPrivKey, grumpkin),
    };
  };

  const mockInnerProofs = (notes: TreeNote[], claimNotes: TreeClaimNote[]) => {
    const proofs: InnerProofData[] = [];
    for (let i = 0; i < notes.length; ++i) {
      const noteCommitment1 = noteAlgos.valueNoteCommitment(notes[i]);
      const noteCommitment2 = noteAlgos.claimNotePartialCommitment(claimNotes[i]);
      const { value, bridgeId, partialState } = claimNotes[i];
      proofs.push({
        proofId: ProofId.DEFI_DEPOSIT,
        assetId: bridgeId.toBuffer(),
        publicOutput: toBufferBE(value, 32),
        noteCommitment1,
        noteCommitment2,
        inputOwner: partialState.slice(0, 32),
        outputOwner: partialState.slice(32),
      } as InnerProofData);
    }
    return proofs;
  };

  beforeAll(async () => {
    const wasm = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(wasm);
    noteAlgos = new NoteAlgorithms(wasm);
  });

  it('convert tree claim note to and from buffer', () => {
    const note = TreeClaimNote.random();
    const buf = note.toBuffer();
    expect(buf.length).toBe(TreeClaimNote.LENGTH);
    const recovered = TreeClaimNote.fromBuffer(buf);
    expect(recovered).toEqual(note);
  });

  it('should correctly batch decrypt notes', async () => {
    const receiver = createKeyPair();

    const numProofs = 8;
    const encryptedNotes: ViewingKey[] = [];
    const notes: TreeNote[] = [];
    const claimNotes: TreeClaimNote[] = [];
    for (let i = 0; i < numProofs; ++i) {
      const ephPrivKey = grumpkin.getRandomFr();
      const note = TreeNote.createFromEphPriv(receiver.pubKey, BigInt(100 + i), 0, 1, ephPrivKey, grumpkin);
      notes.push(note);

      const bridgeId = BridgeId.random();
      const { claimNote, viewingKey } = createClaimNote(BigInt(100 + i), bridgeId, receiver.pubKey, ephPrivKey);
      claimNotes.push(claimNote);
      encryptedNotes.push(viewingKey);
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteAlgos, grumpkin);
    const innerProofs = mockInnerProofs(notes, claimNotes);
    const recovered = recoverTreeClaimNotes(decryptedNotes, innerProofs);
    for (let i = 0; i < numProofs; ++i) {
      expect(recovered[i]).toEqual(claimNotes[i]);
    }
  });

  it('should correctly batch decrypt notes and identify unowned notes', async () => {
    const receiver = createKeyPair();
    const stranger = createKeyPair();

    const numProofs = 8;
    const encryptedNotes: ViewingKey[] = [];
    const notes: TreeNote[] = [];
    const claimNotes: TreeClaimNote[] = [];
    for (let i = 0; i < numProofs; ++i) {
      const owner = i % 2 ? stranger : receiver;
      const ephPrivKey = grumpkin.getRandomFr();
      const note = TreeNote.createFromEphPriv(owner.pubKey, BigInt(100 + i), 0, 1, ephPrivKey, grumpkin);
      notes.push(note);

      const bridgeId = BridgeId.random();
      const { claimNote, viewingKey } = createClaimNote(BigInt(100 + i), bridgeId, owner.pubKey, ephPrivKey);
      claimNotes.push(claimNote);
      encryptedNotes.push(viewingKey);
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteAlgos, grumpkin);
    const innerProofs = mockInnerProofs(notes, claimNotes);
    const recovered = recoverTreeClaimNotes(decryptedNotes, innerProofs);
    for (let i = 0; i < numProofs; ++i) {
      if (i % 2) {
        expect(recovered[i]).toBe(undefined);
      } else {
        expect(recovered[i]).toEqual(claimNotes[i]);
      }
    }
  });

  it('should not decrypt notes with a wrong private key', async () => {
    const receiver = createKeyPair();

    const numProofs = 4;
    const encryptedNotes: ViewingKey[] = [];
    const notes: TreeNote[] = [];
    const claimNotes: TreeClaimNote[] = [];
    for (let i = 0; i < numProofs; ++i) {
      const ephPrivKey = grumpkin.getRandomFr();
      const note = TreeNote.createFromEphPriv(receiver.pubKey, BigInt(100 + i), 0, 1, ephPrivKey, grumpkin);
      notes.push(note);

      const bridgeId = BridgeId.random();
      const { claimNote, viewingKey } = createClaimNote(BigInt(100 + i), bridgeId, receiver.pubKey, ephPrivKey);
      claimNotes.push(claimNote);
      encryptedNotes.push(viewingKey);
    }

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const fakePrivKey = randomBytes(32);
    const decryptedNotes = await batchDecryptNotes(keyBuf, fakePrivKey, noteAlgos, grumpkin);
    const innerProofs = mockInnerProofs(notes, claimNotes);
    const recovered = recoverTreeClaimNotes(decryptedNotes, innerProofs);
    for (let i = 0; i < numProofs; ++i) {
      expect(recovered[i]).toBe(undefined);
    }
  });

  it('should throw if provided proof is not a defi deposit proof', async () => {
    const receiver = createKeyPair();

    const ephPrivKey = grumpkin.getRandomFr();
    const note = TreeNote.createFromEphPriv(receiver.pubKey, BigInt(100), 0, 1, ephPrivKey, grumpkin);
    const { claimNote, viewingKey } = createClaimNote(BigInt(100), BridgeId.random(), receiver.pubKey, ephPrivKey);
    const encryptedNotes = [viewingKey];
    const notes = [note];
    const claimNotes = [claimNote];

    const keyBuf = Buffer.concat(encryptedNotes.map(vk => vk.toBuffer()));
    const decryptedNotes = await batchDecryptNotes(keyBuf, receiver.privKey, noteAlgos, grumpkin);

    const innerProofs = mockInnerProofs(notes, claimNotes);
    innerProofs[0].proofId = ProofId.JOIN_SPLIT;
    expect(() => recoverTreeClaimNotes(decryptedNotes, innerProofs)).toThrow();
  });
});
