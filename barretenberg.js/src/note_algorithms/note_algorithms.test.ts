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

    expect(nullifier1.toString('hex')).toEqual('0d57355d79c04da7fae6919005d23900345b9fb0c11917fa4ada00cc56582845');
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
    expect(nullifier.toString('hex')).toEqual('039395785283f875f10902a7548d83ad959b5a06c8c32943a7735ee2c9f14e1e');
  });

  it('should create correct commitment for defi interaction note', async () => {
    const bridgeId = BridgeId.fromBigInt(BigInt(456));
    const note = new DefiInteractionNote(bridgeId, 1, BigInt(123), BigInt(456), BigInt(789), true);
    const commitment = noteAlgos.defiInteractionNoteCommitment(note);
    expect(commitment.toString('hex')).toEqual('0196130e904cada31725bd8b7bb73de20eda978c92a2e05cd735429df1c88a47');
  });

  it('should compute correct alias id nullifier', async () => {
    const accountNonce = 1;
    const accountAliasId = AccountAliasId.fromAlias('pebble', accountNonce, blake2s);
    const nullifier = noteAlgos.accountAliasIdNullifier(accountAliasId);
    expect(nullifier.toString('hex')).toEqual('01ef0643a2bc47eeed66a6a123326171a90773e9251684e7d87f8771177d09b3');
  });
});
