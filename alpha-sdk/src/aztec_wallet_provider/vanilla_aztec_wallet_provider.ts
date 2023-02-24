import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { BlockSource } from '@aztec/barretenberg/block_source';
import { Pedersen, SchnorrSignature } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { PooledFftFactory, SingleFftFactory } from '@aztec/barretenberg/fft';
import { createDebugLogger } from '@aztec/barretenberg/log';
import {
  NoteAlgorithms,
  NoteDecryptor,
  PooledNoteDecryptor,
  SingleNoteDecryptor,
} from '@aztec/barretenberg/note_algorithms';
import { PooledPippenger, SinglePippenger } from '@aztec/barretenberg/pippenger';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { AuthAlgorithms, KeyPairAuthAlgorithms } from '../auth_algorithms/index.js';
import { BlockContext } from '../block_context/block_context.js';
import { BlockDecryptor, DecryptedData } from '../block_decryptor/index.js';
import { SinglePedersen } from '../index.js';
import { KeyStore, Permission } from '../key_store/index.js';
import { ProofInput, ProofInputFactory, ProofOutputFactory, ProofRequestData } from '../proofs/index.js';
import { AztecWalletProvider } from './aztec_wallet_provider.js';

const debug = createDebugLogger('bb:vanilla_aztec_wallet_provider');

export class VanillaAztecWalletProvider implements AztecWalletProvider {
  private accountPublicKey!: GrumpkinAddress;
  private authAlgos!: AuthAlgorithms;

  static async new(
    keyStore: KeyStore,
    proverless: boolean,
    blockSource: BlockSource,
    wasm?: BarretenbergWasm,
    workerPool?: WorkerPool,
    numWorkers = 1,
  ) {
    debug('creating vanilla aztec wallet provider...');

    const bbWasm = wasm || (await BarretenbergWasm.new());
    const bbWorkerPool = workerPool || (numWorkers ? await WorkerPool.new(bbWasm, numWorkers) : undefined);
    const noteDecryptor = bbWorkerPool ? new PooledNoteDecryptor(bbWorkerPool) : new SingleNoteDecryptor(bbWasm);
    const pippenger = bbWorkerPool ? new PooledPippenger(bbWorkerPool) : new SinglePippenger(bbWasm);
    const fftFactory = bbWorkerPool ? new PooledFftFactory(bbWorkerPool) : new SingleFftFactory(bbWasm);
    const noteAlgos = new NoteAlgorithms(bbWasm);
    const grumpkin = new Grumpkin(bbWasm);
    const pedersen = new SinglePedersen(bbWasm); // We use pedersen to compress data, no need for a worker to hash to tree.

    const blockDecryptor = new BlockDecryptor();
    const proofInputFactory = new ProofInputFactory(noteAlgos, grumpkin, pedersen, bbWasm);
    const proofOutputFactory = new ProofOutputFactory(
      proverless,
      noteAlgos,
      pippenger,
      fftFactory,
      bbWasm,
      bbWorkerPool,
    );

    return new VanillaAztecWalletProvider(
      keyStore,
      blockSource,
      blockDecryptor,
      noteDecryptor,
      proofInputFactory,
      proofOutputFactory,
      noteAlgos,
      grumpkin,
      pedersen,
      bbWasm,
    );
  }

  constructor(
    private keyStore: KeyStore,
    private blockSource: BlockSource,
    private blockDecryptor: BlockDecryptor,
    private noteDecryptor: NoteDecryptor,
    private proofInputFactory: ProofInputFactory,
    private proofOutputFactory: ProofOutputFactory,
    private noteAlgos: NoteAlgorithms,
    private grumpkin: Grumpkin,
    private pedersen: Pedersen,
    private wasm: BarretenbergWasm,
  ) {}

  public async destroy() {
    await this.proofOutputFactory.destroy();
  }

  public async connect(permissions?: Permission[]) {
    const { accountKey } = await this.keyStore.connect(permissions);
    this.accountPublicKey = accountKey.getPublicKey();
    this.authAlgos = new KeyPairAuthAlgorithms(
      accountKey,
      this.grumpkin,
      this.noteAlgos,
      this.noteDecryptor,
      this.wasm,
    );
    return this.accountPublicKey;
  }

  public async disconnect() {
    await this.keyStore.disconnect();
    await this.destroy();
  }

  public getAccountPublicKey() {
    if (!this.accountPublicKey) {
      throw new Error('Call connect() first.');
    }

    return Promise.resolve(this.accountPublicKey);
  }

  public async getSpendingPublicKey() {
    return await this.keyStore.getSpendingPublicKey();
  }

  public async getPermissions() {
    return await this.keyStore.getPermissions();
  }

  public async setPermissions(permission: Permission[]) {
    return await this.keyStore.setPermissions(permission);
  }

  public async signProofs(proofInputs: ProofInput[]) {
    if (!this.accountPublicKey) {
      throw new Error('Call connect() first.');
    }

    return await this.keyStore.signProofs(proofInputs);
  }

  public async createProofs(proofInputs: ProofInput[], signatures: SchnorrSignature[]) {
    if (!this.accountPublicKey) {
      throw new Error('Call connect() first.');
    }

    // TODO
    // const proofRequestData = generateProofRequestData(proofInputs);
    // const { approved, error } = await this.keyStore.approveProofsRequest(proofRequestData);
    // if (!approved) {
    //   throw new Error(error);
    // }

    const keyPair = await this.keyStore.getAccountKey();
    return await this.proofOutputFactory.createProofs(proofInputs, signatures, keyPair);
  }

  public async requestProofInputs(proofRequestData: ProofRequestData) {
    if (!this.accountPublicKey) {
      throw new Error('Call connect() first.');
    }

    const { approved, error } = await this.keyStore.approveProofInputsRequest(proofRequestData);
    if (!approved) {
      throw new Error(error);
    }

    return await this.proofInputFactory.createProofInputs(proofRequestData, this.authAlgos);
  }

  public async requestProofs(proofRequestData: ProofRequestData) {
    if (!this.accountPublicKey) {
      throw new Error('Call connect() first.');
    }

    const { approved, error } = await this.keyStore.approveProofsRequest(proofRequestData);
    if (!approved) {
      throw new Error(error);
    }

    const proofInputs = await this.proofInputFactory.createProofInputs(proofRequestData, this.authAlgos);
    const signatures = await this.keyStore.signProofs(proofInputs);
    const keyPair = await this.keyStore.getAccountKey();
    return await this.proofOutputFactory.createProofs(proofInputs, signatures, keyPair);
  }

  public async decryptBlocks(from: number, to: number): Promise<DecryptedData> {
    if (!this.accountPublicKey) {
      throw new Error('Call connect() first.');
    }

    const fetchedBlocks = await this.blockSource.getBlocks(from);
    const blocksInRange = fetchedBlocks.filter(block => block.rollupId >= from && block.rollupId < to);

    if (blocksInRange.length !== to - from) {
      throw new Error('Could not fetch all blocks in range');
    }

    const blockContexts = blocksInRange.map(b => BlockContext.fromBlock(b, this.pedersen));

    return await this.blockDecryptor.decryptBlocks(
      this.accountPublicKey,
      this.authAlgos,
      this.noteAlgos,
      blockContexts,
    );
  }
}

export class VanillaAztecWalletProviderFactory {
  public static async new(proverless: boolean, wasm: BarretenbergWasm, workerPool?: WorkerPool, numWorkers?: number) {
    const bbWasm = wasm || (await BarretenbergWasm.new());
    const bbWorkerPool = workerPool || (numWorkers ? await WorkerPool.new(bbWasm, numWorkers) : undefined);
    const noteDecryptor = bbWorkerPool ? new PooledNoteDecryptor(bbWorkerPool) : new SingleNoteDecryptor(bbWasm);
    const pippenger = bbWorkerPool ? new PooledPippenger(bbWorkerPool) : new SinglePippenger(bbWasm);
    const fftFactory = bbWorkerPool ? new PooledFftFactory(bbWorkerPool) : new SingleFftFactory(bbWasm);
    const noteAlgos = new NoteAlgorithms(bbWasm);
    const grumpkin = new Grumpkin(bbWasm);
    const pedersen = new SinglePedersen(bbWasm); // We use pedersen to compress data, no need for a worker to hash to tree.

    const blockDecryptor = new BlockDecryptor();
    const proofInputFactory = new ProofInputFactory(noteAlgos, grumpkin, pedersen, bbWasm);
    const proofOutputFactory = new ProofOutputFactory(
      proverless,
      noteAlgos,
      pippenger,
      fftFactory,
      bbWasm,
      bbWorkerPool,
    );
    return new VanillaAztecWalletProviderFactory(
      blockDecryptor,
      noteDecryptor,
      proofInputFactory,
      proofOutputFactory,
      noteAlgos,
      grumpkin,
      pedersen,
      bbWasm,
    );
  }

  constructor(
    private blockDecryptor: BlockDecryptor,
    private noteDecryptor: NoteDecryptor,
    private proofInputFactory: ProofInputFactory,
    private proofOutputFactory: ProofOutputFactory,
    private noteAlgos: NoteAlgorithms,
    private grumpkin: Grumpkin,
    private pedersen: Pedersen,
    private wasm: BarretenbergWasm,
  ) {}

  public create(keyStore: KeyStore, blockSource: BlockSource) {
    return new VanillaAztecWalletProvider(
      keyStore,
      blockSource,
      this.blockDecryptor,
      this.noteDecryptor,
      this.proofInputFactory,
      this.proofOutputFactory,
      this.noteAlgos,
      this.grumpkin,
      this.pedersen,
      this.wasm,
    );
  }
}
