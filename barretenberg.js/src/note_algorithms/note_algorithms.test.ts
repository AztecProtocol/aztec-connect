import { AliasHash } from '../account_id';
import { GrumpkinAddress } from '../address';
import { BridgeId } from '../bridge_id';
import { Blake2s } from '../crypto';
import { Grumpkin } from '../ecc/grumpkin';
import { BarretenbergWasm } from '../wasm';
import { ClaimNoteTxData } from './claim_note_tx_data';
import { DefiInteractionNote } from './defi_interaction_note';
import { NoteAlgorithms } from './note_algorithms';
import { TreeClaimNote } from './tree_claim_note';
import { TreeNote } from './tree_note';

describe('compute_nullifier', () => {
  let grumpkin!: Grumpkin;
  let blake2s: Blake2s;
  let noteAlgos!: NoteAlgorithms;
  let pubKey: GrumpkinAddress;

  const privateKey = Buffer.from('0b9b3adee6b3d81b28a0886b2a8415c7da31291a5e96bb7a56639e177d301beb', 'hex');
  const noteSecret = Buffer.from('0000000011111111000000001111111100000000111111110000000011111111', 'hex');
  const dummyNullifier = Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex');

  beforeAll(async () => {
    const barretenberg = await BarretenbergWasm.new();
    grumpkin = new Grumpkin(barretenberg);
    blake2s = new Blake2s(barretenberg);
    noteAlgos = new NoteAlgorithms(barretenberg);
    pubKey = new GrumpkinAddress(grumpkin.mul(Grumpkin.one, privateKey));
  });

  it('should compute correct nullifier', () => {
    const inputNote1 = new TreeNote(pubKey, BigInt(100), 0, true, noteSecret, Buffer.alloc(32), dummyNullifier);
    inputNote1.noteSecret = noteSecret;

    const inputNote1Enc = noteAlgos.valueNoteCommitment(inputNote1);

    const nullifier1 = noteAlgos.valueNoteNullifier(inputNote1Enc, privateKey);

    expect(nullifier1.toString('hex')).toEqual('1d6bac88f87297f2b81d0131534f1eec5f15404bb85721020cccc6497677c9f5');
  });

  it('should commit to claim note and compute its nullifier', () => {
    const bridgeId = BridgeId.fromBigInt(BigInt(456));
    const claimNoteTxData = new ClaimNoteTxData(BigInt(100), bridgeId, noteSecret, dummyNullifier);
    const accountRequired = false;
    const partialState = noteAlgos.valueNotePartialCommitment(
      claimNoteTxData.partialStateSecret,
      pubKey,
      accountRequired,
    );
    const inputNote = new TreeClaimNote(
      claimNoteTxData.value,
      claimNoteTxData.bridgeId,
      0,
      BigInt(0),
      partialState,
      claimNoteTxData.inputNullifier,
    );
    const inputNoteEnc = noteAlgos.claimNotePartialCommitment(inputNote);
    const nullifier = noteAlgos.claimNoteNullifier(inputNoteEnc);
    expect(nullifier.toString('hex')).toEqual('039395785283f875f10902a7548d83ad959b5a06c8c32943a7735ee2c9f14e1e');
  });

  it('should create correct commitment for defi interaction note', () => {
    const bridgeId = BridgeId.fromBigInt(BigInt(456));
    const note = new DefiInteractionNote(bridgeId, 1, BigInt(123), BigInt(456), BigInt(789), true);
    const commitment = noteAlgos.defiInteractionNoteCommitment(note);
    expect(commitment.toString('hex')).toEqual('0196130e904cada31725bd8b7bb73de20eda978c92a2e05cd735429df1c88a47');
  });

  it('should compute correct alias hash nullifier', () => {
    const aliasHash = AliasHash.fromAlias('pebble', blake2s);
    const nullifier = noteAlgos.accountAliasHashNullifier(aliasHash);
    expect(nullifier.toString('hex')).toEqual('0c61620f2cef41c6c9401025a658170a6b756d3f5d3af33c8d53f39b21d84ca6');
  });

  it('should compute correct public key nullifier', () => {
    const nullifier = noteAlgos.accountPublicKeyNullifier(pubKey);
    expect(nullifier.toString('hex')).toEqual('293e4583639708553c09d48eb546ea2a784c75e5619f099b41fa7ea42b68bde8');
  });
});
