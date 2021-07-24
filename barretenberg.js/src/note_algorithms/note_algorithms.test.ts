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
    inputNote1.noteSecret = noteSecret;

    const inputNote1Enc = noteAlgos.valueNoteCommitment(inputNote1);

    const nullifier1 = noteAlgos.valueNoteNullifier(inputNote1Enc, 1, privateKey);

    expect(nullifier1.toString('hex')).toEqual('2a6a842dda2ba35337123794d6ac6fc8910b6920ebc991fafb3f5233f8071764');
  });

  it('should commit to claim note and compute its nullifier', async () => {
    const bridgeId = BridgeId.fromBigInt(BigInt(456));
    const ownerId = new AccountId(pubKey, 0);
    const claimNoteTxData = new ClaimNoteTxData(BigInt(100), bridgeId, ownerId.publicKey, ownerId.nonce, noteSecret);
    const partialState = noteAlgos.valueNotePartialCommitment(claimNoteTxData.noteSecret, ownerId);
    const inputNote = new TreeClaimNote(claimNoteTxData.value, claimNoteTxData.bridgeId, 0, partialState);
    const inputNoteEnc = noteAlgos.claimNotePartialCommitment(inputNote);
    const nullifier = noteAlgos.claimNoteNullifier(inputNoteEnc, 1);
    expect(nullifier.toString('hex')).toEqual('19eb0092121cea45882270797bb8f1c2707e3109710012ac9e4d7509ce229406');
  });

  it('should create correct commitment for defi interaction note', async () => {
    const bridgeId = BridgeId.fromBigInt(BigInt(456));
    const note = new DefiInteractionNote(bridgeId, 1, BigInt(123), BigInt(456), BigInt(789), true);
    const commitment = noteAlgos.defiInteractionNoteCommitment(note);
    expect(commitment.toString('hex')).toEqual('2297ea2729d9d117637db501f2463fb6db1cef558495be1f5aba72c27fe3f615');
  });
});
