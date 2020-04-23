import levelup from 'levelup';
import memdown from 'memdown';
import createDebug from 'debug';
import { PooledFft } from 'barretenberg-es/fft';
import { PooledPippenger } from 'barretenberg-es/pippenger';
import { JoinSplitProver, JoinSplitVerifier, JoinSplitTx } from 'barretenberg-es/client_proofs/join_split_proof';
import { Prover } from 'barretenberg-es/client_proofs/prover';
import { Schnorr } from 'barretenberg-es/crypto/schnorr';
import { Blake2s } from 'barretenberg-es/crypto/blake2s';
import { Pedersen } from 'barretenberg-es/crypto/pedersen';
import { Note } from 'barretenberg-es/client_proofs/note';
import { Crs } from 'barretenberg-es/crs';
import { BarretenbergWasm } from 'barretenberg-es/wasm';
import { WorkerPool } from 'barretenberg-es/wasm/worker_pool';
import { MerkleTree } from 'barretenberg-es/merkle_tree';
import { NotePicker } from './note_picker';

const debug = createDebug('bb:join_split_proof');
createDebug.enable('bb:*');

interface CreateProofParams {
  inputValue: number;
  outputValue: number;
}

export default class JoinSplitProof {
  private pool!: WorkerPool;
  private schnorr!: Schnorr;
  private blake2s!: Blake2s;
  private pedersen!: Pedersen;
  private tree!: MerkleTree;
  private joinSplitProver!: JoinSplitProver;
  private joinSplitVerifier!: JoinSplitVerifier;
  private notePicker!: NotePicker;

  public async init() {
    const circuitSize = 128 * 1024;

    const crs = new Crs(circuitSize);
    await crs.download();

    const barretenberg = await BarretenbergWasm.new();

    this.pool = new WorkerPool();
    await this.pool.init(barretenberg.module, Math.min(navigator.hardwareConcurrency, 8));

    const barretenbergWorker = this.pool.workers[0];

    const pippenger = new PooledPippenger();
    await pippenger.init(crs.getData(), this.pool);

    const fft = new PooledFft(this.pool);
    await fft.init(circuitSize);

    const prover = new Prover(barretenbergWorker, pippenger, fft);

    this.schnorr = new Schnorr(barretenberg);
    this.blake2s = new Blake2s(barretenberg);
    this.pedersen = new Pedersen(barretenberg);
    this.tree = new MerkleTree(levelup(memdown()), this.pedersen, this.blake2s, 'data', 32);
    debug(this.tree.getRoot());
    this.joinSplitProver = new JoinSplitProver(barretenberg, prover);
    this.joinSplitVerifier = new JoinSplitVerifier(pippenger.pool[0]);

    // const notes = await this.loadMerkleData();
    this.notePicker = new NotePicker([]);

    debug('creating keys...');
    const start = new Date().getTime();
    await this.joinSplitProver.init();
    await this.joinSplitVerifier.init(crs.getG2Data());
    debug(`created circuit keys: ${new Date().getTime() - start}ms`);
  }

  private async loadMerkleData() {
    // prettier-ignore
    const pk = Buffer.from([
      0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
      0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);
    // prettier-ignore
    const viewingKey = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11 ]);

    const pubKey = this.schnorr.computePublicKey(pk);
    const inputNote1 = new Note(pubKey, viewingKey, 100);
    const inputNote2 = new Note(pubKey, viewingKey, 50);

    const inputNote1Enc = await this.joinSplitProver.encryptNote(inputNote1);
    const inputNote2Enc = await this.joinSplitProver.encryptNote(inputNote2);
    await this.tree.updateElement(0, inputNote1Enc);
    await this.tree.updateElement(1, inputNote2Enc);

    return [
      { index: 0, note: inputNote1 },
      { index: 1, note: inputNote2 },
    ];
  }

  public async destroy() {
    await this.pool.destroy();
  }

  public async createProof({ inputValue, outputValue }: CreateProofParams) {
    // prettier-ignore
    const senderPrivateKey = Buffer.from([
      0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
      0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb]);
    const senderPublicKey = this.schnorr.computePublicKey(senderPrivateKey);
    const receiverPublicKey = senderPublicKey;
    // prettier-ignore
    const senderViewingKey = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11,
      0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, 0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11]);
    const receiverViewingKey = senderViewingKey;

    const notes = this.notePicker.pick(inputValue);
    const numInputNotes = notes.length;

    while (notes.length < 2) {
      notes.push({ index: 0, note: new Note(senderPublicKey, senderViewingKey, 0) });
    }

    const totalInputValue = notes.reduce((sum, note) => sum + note.note.value, 0);
    const inputNoteIndices = notes.map(n => n.index);
    const inputNotes = notes.map(n => n.note);
    const inputNotePaths = await Promise.all(inputNoteIndices.map(async idx => this.tree.getHashPath(idx)));

    const remainder = totalInputValue - inputValue;
    const outputNotes = [
      new Note(receiverPublicKey, receiverViewingKey, outputValue),
      // TODO: Make unviewable zero note when remainder 0?
      new Note(senderPublicKey, senderViewingKey, remainder)
    ];

    const publicInput = Math.max(0, outputValue - inputValue);
    const publicOutput = Math.max(0, inputValue - outputValue);

    const signature = await this.joinSplitProver.sign4Notes([...inputNotes, ...outputNotes], senderPrivateKey);

    const tx = new JoinSplitTx(
      senderPublicKey,
      publicInput,
      publicOutput,
      numInputNotes,
      inputNoteIndices,
      this.tree.getRoot(),
      inputNotePaths,
      inputNotes,
      outputNotes,
      signature,
    );

    debug(tx);

    debug('creating proof...');
    const start = new Date().getTime();
    const proof = await this.joinSplitProver.createJoinSplitProof(tx);
    debug(`created proof: ${new Date().getTime() - start}ms`);
    debug(`proof size: ${proof.length}`);

    const verified = await this.joinSplitVerifier.verifyProof(proof);
    debug(`verified: ${verified}`);

    if (verified) {
      const encryptedOutputNotes = outputNotes.map(n => this.joinSplitProver.encryptNote(n));
      for (let i = 0; i < encryptedOutputNotes.length; ++i) {
        const index = this.tree.getSize();
        await this.tree.updateElement(index, encryptedOutputNotes[i]);
        this.notePicker.addNote({
          index,
          note: outputNotes[i],
        });
      }
      for (let i = 0; i < numInputNotes; ++i) {
        this.notePicker.removeNote(notes[i]);
      }
    }

    return verified;
  }

  public async verifyProof(proof: Buffer) {
    const verified = await this.joinSplitVerifier.verifyProof(proof);
    debug(`verified: ${verified}`);
    return verified;
  }
}
