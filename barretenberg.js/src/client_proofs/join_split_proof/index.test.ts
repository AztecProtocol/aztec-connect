import { JoinSplitProver } from './index';
import { Schnorr } from '../../crypto/schnorr';
import createDebug from 'debug';
import { BarretenbergWasm } from '../../wasm';
import { JoinSplitTx } from './join_split_tx';
import { MerkleTree } from '../../merkle_tree';
import levelup from 'levelup';
import memdown from 'memdown';
import { Blake2s } from '../../crypto/blake2s';
import { Pedersen } from '../../crypto/pedersen';
import { Note } from '../note';

const debug = createDebug('bb:join_split_proof');

describe('join_split_proof', () => {
  let barretenberg!: BarretenbergWasm;
  let joinSplitProver!: JoinSplitProver;
  // let createNoteVerifier!: CreateNoteVerifier;
  let schnorr!: Schnorr;
  let blake2s!: Blake2s;
  let pedersen!: Pedersen;

  beforeAll(async () => {
    barretenberg = await BarretenbergWasm.new();
    joinSplitProver = new JoinSplitProver(barretenberg);
    blake2s = new Blake2s(barretenberg);
    pedersen = new Pedersen(barretenberg);
    schnorr = new Schnorr(barretenberg);
  });

  it('should do something', async () => {
    // prettier-ignore
    const pk = Buffer.from([
      0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
      0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);
    // prettier-ignore
    const viewingKey = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11 ]);

    const pubKey = schnorr.computePublicKey(pk);
    const inputNote1 = new Note(pubKey, viewingKey, 100);
    const inputNote2 = new Note(pubKey, viewingKey, 50);
    const outputNote1 = new Note(pubKey, viewingKey, 70);
    const outputNote2 = new Note(pubKey, viewingKey, 80);

    const inputNote1Enc = joinSplitProver.encryptNote(inputNote1);
    const inputNote2Enc = joinSplitProver.encryptNote(inputNote2);
    const tree = new MerkleTree(levelup(memdown()), pedersen, blake2s, 'data', 32);
    await tree.updateElement(0, inputNote1Enc);
    await tree.updateElement(1, inputNote2Enc);

    const inputNote1Path = await tree.getHashPath(0);
    const inputNote2Path = await tree.getHashPath(1);

    const signature = joinSplitProver.sign4Notes([inputNote1, inputNote2, outputNote1, outputNote2], pk);

    const tx = new JoinSplitTx(
      pubKey,
      10,
      20,
      2,
      [0, 1],
      tree.getRoot(),
      [inputNote1Path, inputNote2Path],
      [inputNote1, inputNote2],
      [outputNote1, outputNote2],
      signature,
    );

    await joinSplitProver.createJoinSplitProof(tx);
  });
});
