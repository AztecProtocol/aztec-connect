import { AccountId } from '../account_id';
import { GrumpkinAddress } from '../address';
import { BridgeId } from '../bridge_id';
import { Grumpkin } from '../ecc/grumpkin';
import { BarretenbergWasm } from '../wasm';
import { ClaimNoteTxData } from './claim_note_tx_data';
import { DefiInteractionNote } from './defi_interaction_note';
import { NoteAlgorithms } from './note_algorithms';
import { TreeClaimNote } from './tree_claim_note';
import { TreeNote } from './tree_note';

describe('compute_nullifier', () => {
  let grumpkin!: Grumpkin;
  let noteAlgos!: NoteAlgorithms;
  let pubKey: GrumpkinAddress;

  const privateKey = Buffer.from('0b9b3adee6b3d81b28a0886b2a8415c7da31291a5e96bb7a56639e177d301beb', 'hex');
  const noteSecret = Buffer.from('0000000011111111000000001111111100000000111111110000000011111111', 'hex');

  beforeAll(async () => {
    const barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
    noteAlgos = new NoteAlgorithms(barretenberg);
    pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
  });

  it('should compute correct nullifier', async () => {
    const inputNote1 = new TreeNote(pubKey, BigInt(100), 0, 0, noteSecret);
    const inputNote2 = new TreeNote(pubKey, BigInt(50), 0, 0, noteSecret);
    inputNote1.noteSecret = noteSecret;
    inputNote2.noteSecret = noteSecret;

    const inputNote1Enc = noteAlgos.commitNote(inputNote1);
    const inputNote2Enc = noteAlgos.commitNote(inputNote2);

    const nullifier1 = noteAlgos.computeNoteNullifier(inputNote1Enc, 1, privateKey);
    const nullifier2 = noteAlgos.computeNoteNullifier(inputNote2Enc, 0, privateKey);

    expect(nullifier1.toString('hex')).toEqual('0ce5122c0eaedd9f92818264f59d79477b1bdb1941cef071ae5ecf7a1dad0a88');
    expect(nullifier2.toString('hex')).toEqual('232dcd46cdcc3de3219e323fedb5fb4e3640596cd14f764be4b3480794daf564');
  });

  it('should commit to claim note and compute its nullifier', async () => {
    const bridgeId = BridgeId.fromBigInt(BigInt(456));
    const ownerId = new AccountId(pubKey, 0);
    const claimNoteTxData = new ClaimNoteTxData(BigInt(100), bridgeId, ownerId.publicKey, ownerId.nonce, noteSecret);
    const partialState = noteAlgos.computePartialState(claimNoteTxData, ownerId);
    const inputNote = new TreeClaimNote(claimNoteTxData.value, claimNoteTxData.bridgeId, 0, partialState);
    const inputNoteEnc = noteAlgos.commitClaimNote(inputNote);
    const nullifier = noteAlgos.computeClaimNoteNullifier(inputNoteEnc, 1);
    expect(nullifier.toString('hex')).toEqual('15a41ad9053ec91aa28799e1787ba7a7ee5989520ed2ee6241da832877643b7f');
  });

  it('should create correct commitment for defi interaction note', async () => {
    const bridgeId = BridgeId.fromBigInt(BigInt(456));
    const note = new DefiInteractionNote(bridgeId, 1, BigInt(123), BigInt(456), BigInt(789), true);
    const expected =
      '28abee83d6e5fd094b8305724149c9f762135730d578386632ccffb1fdd1f6082e6db7be8d0824b8d5692a8822af16a1adad7a33c2fd8294042ab5e0364cf28e';
    const commitment = noteAlgos.commitDefiInteractionNote(note).toString('hex');
    expect(commitment).toEqual(expected);
  });
});
