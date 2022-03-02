import { AccountAliasId, AccountId } from '../account_id';
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

  it('should compute correct nullifier', async () => {
    const inputNote1 = new TreeNote(pubKey, BigInt(100), 0, 0, noteSecret, Buffer.alloc(32), dummyNullifier);
    inputNote1.noteSecret = noteSecret;

    const inputNote1Enc = noteAlgos.valueNoteCommitment(inputNote1);

    const nullifier1 = noteAlgos.valueNoteNullifier(inputNote1Enc, privateKey);

    expect(nullifier1.toString('hex')).toEqual('1687a9528e07b776811af3c21ae2d30f750b53c08aba6573423f0660ae12e000');
  });

  it('should commit to claim note and compute its nullifier', async () => {
    const bridgeId = BridgeId.fromBigInt(BigInt(456));
    const ownerId = new AccountId(pubKey, 0);
    const claimNoteTxData = new ClaimNoteTxData(BigInt(100), bridgeId, noteSecret, dummyNullifier);
    const partialState = noteAlgos.valueNotePartialCommitment(claimNoteTxData.partialStateSecret, ownerId);
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
    expect(nullifier.toString('hex')).toEqual('11860dcc7dafe734ac85aed7d7e9bd127b2dd8c655607429bce7275ac9d3f22c');
  });

  it('should create correct commitment for defi interaction note', async () => {
    const bridgeId = BridgeId.fromBigInt(BigInt(456));
    const note = new DefiInteractionNote(bridgeId, 1, BigInt(123), BigInt(456), BigInt(789), true);
    const commitment = noteAlgos.defiInteractionNoteCommitment(note);
    expect(commitment.toString('hex')).toEqual('2297ea2729d9d117637db501f2463fb6db1cef558495be1f5aba72c27fe3f615');
  });

  it('should compute correct alias id nullifier', async () => {
    const accountNonce = 1;
    const accountAliasId = AccountAliasId.fromAlias('pebble', accountNonce, blake2s);
    const nullifier = noteAlgos.accountAliasIdNullifier(accountAliasId);
    expect(nullifier.toString('hex')).toEqual('296ffc495fd4a753552f43a3018b3725ffdbf38a882d4475fadc12ea93b5178f');
  });
});
