import { AccountProver, JoinSplitProver, UnrolledProver } from '@aztec/barretenberg/client_proofs';
import { NetCrs } from '@aztec/barretenberg/crs';
import { randomBytes, SchnorrSignature } from '@aztec/barretenberg/crypto';
import { FftFactory } from '@aztec/barretenberg/fft';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { Pippenger } from '@aztec/barretenberg/pippenger';
import { BarretenbergWasm, WorkerPool } from '@aztec/barretenberg/wasm';
import { KeyPair } from '../../key_pair/index.js';
import { MemorySerialQueue } from '../../serial_queue/index.js';
import {
  AccountProofInput,
  DefiProofInput,
  PaymentProofInput,
  ProofInput,
  toJoinSplitTx,
} from '../proof_input/index.js';
import { AccountProofCreator } from './account_proof_creator.js';
import { DefiProofCreator } from './defi_proof_creator.js';
import { PaymentProofCreator } from './payment_proof_creator.js';
import { ProofOutput } from './proof_output.js';

const CREATE_PROOF_TIMEOUT = 60 * 1000;

const createTxRefNo = () => randomBytes(4).readUInt32BE(0);

export interface ProversOptions {
  proverless: boolean;
}

export class ProofOutputFactory {
  private serialQueue = new MemorySerialQueue();
  private joinSplitProver!: JoinSplitProver;
  private accountProver!: AccountProver;
  private accountProofCreator!: AccountProofCreator;
  private paymentProofCreator!: PaymentProofCreator;
  private defiProofCreator!: DefiProofCreator;
  private debug = createDebugLogger('bb:provers');

  constructor(
    private proverless: boolean,
    private noteAlgos: NoteAlgorithms,
    private pippenger: Pippenger,
    private fftFactory: FftFactory,
    private barretenberg: BarretenbergWasm,
    private workerPool?: WorkerPool,
  ) {}

  public async destroy() {
    this.debug('destroying...');

    // The serial queue will cancel itself. This ensures that anything currently in the queue finishes, and ensures
    // that once the await to push() returns, nothing else is on, or can be added to the queue.
    await this.serialQueue.push(() => Promise.resolve(this.serialQueue.cancel()));

    this.debug('destroyed.');
  }

  public async createProofs(proofInputs: ProofInput[], signatures: SchnorrSignature[], keyPair: KeyPair) {
    return await this.serialQueue.push(async () => {
      // TODO - init pippenger here instead of the coreSdk.
      // await this.initProvers();
      const txRefNo = proofInputs.length > 1 ? createTxRefNo() : 0;
      const proofOutputs: ProofOutput[] = [];
      for (let i = 0; i < proofInputs.length; ++i) {
        const proofInput = proofInputs[i];
        const signature = signatures[i];
        if (Object.prototype.hasOwnProperty.call(proofInput, 'partialStateSecretEphPubKey')) {
          proofOutputs.push(await this.createDefiProof(proofInput as DefiProofInput, signature, txRefNo, keyPair));
        } else if (Object.prototype.hasOwnProperty.call(proofInput, 'viewingKeys')) {
          proofOutputs.push(
            await this.createPaymentProof(proofInput as PaymentProofInput, signature, txRefNo, keyPair),
          );
        } else {
          proofOutputs.push(await this.createAccountProof(proofInput as AccountProofInput, signature, txRefNo));
        }
      }
      return proofOutputs;
    });
  }

  // TODO - change it back to private method and only use 'createProofs'.
  public async createPaymentProof(
    { tx, viewingKeys }: PaymentProofInput,
    signature: SchnorrSignature,
    txRefNo: number,
    keyPair: KeyPair,
    timeout = CREATE_PROOF_TIMEOUT,
  ) {
    await this.createJoinSplitProofCreator();
    await this.computeJoinSplitProvingKey(timeout);
    const accountPrivateKey = await keyPair.getPrivateKey();
    const proofOutput = await this.paymentProofCreator.createProof(
      toJoinSplitTx(tx, accountPrivateKey),
      viewingKeys,
      signature,
      txRefNo,
      timeout,
    );
    return { ...proofOutput, outputNotes: tx.outputNotes };
  }

  // TODO - change it back to private method and only use 'createProofs'.
  public async createAccountProof(
    { tx }: AccountProofInput,
    signature: SchnorrSignature,
    txRefNo: number,
    timeout = CREATE_PROOF_TIMEOUT,
  ) {
    await this.createAccountProofCreator();
    await this.computeAccountProvingKey(timeout);
    const proofOutput = await this.accountProofCreator.createProof(tx, signature, txRefNo, timeout);
    return { ...proofOutput, outputNotes: [] };
  }

  // TODO - change it back to private method and only use 'createProofs'.
  public async createDefiProof(
    { tx, viewingKey, partialStateSecretEphPubKey }: DefiProofInput,
    signature: SchnorrSignature,
    txRefNo: number,
    keyPair: KeyPair,
    timeout = CREATE_PROOF_TIMEOUT,
  ) {
    await this.createJoinSplitProofCreator();
    await this.computeJoinSplitProvingKey(timeout);
    const accountPrivateKey = await keyPair.getPrivateKey();
    const proofOutput = await this.defiProofCreator.createProof(
      toJoinSplitTx(tx, accountPrivateKey),
      viewingKey,
      partialStateSecretEphPubKey,
      signature,
      txRefNo,
      timeout,
    );
    return { ...proofOutput, outputNotes: tx.outputNotes };
  }

  private async getCrsData(circuitSize: number) {
    this.debug('downloading crs data...');
    const crs = new NetCrs(circuitSize);
    await crs.init();
    this.debug('done.');
    return Buffer.from(crs.getData());
  }

  private async initProvers() {
    if (this.accountProofCreator) {
      return;
    }

    const maxCircuitSize = Math.max(JoinSplitProver.getCircuitSize(), AccountProver.getCircuitSize());
    const crsData = await this.getCrsData(maxCircuitSize);
    await this.pippenger.init(crsData);
    await this.createJoinSplitProofCreator();
    await this.createAccountProofCreator();
  }

  private async createJoinSplitProofCreator() {
    if (this.defiProofCreator) {
      return;
    }
    const fft = await this.fftFactory.createFft(JoinSplitProver.getCircuitSize(this.proverless));
    const unrolledProver = new UnrolledProver(
      this.workerPool ? this.workerPool.workers[0] : this.barretenberg,
      this.pippenger,
      fft,
    );
    this.joinSplitProver = new JoinSplitProver(unrolledProver, this.proverless);
    this.paymentProofCreator = new PaymentProofCreator(this.joinSplitProver);
    this.defiProofCreator = new DefiProofCreator(this.joinSplitProver, this.noteAlgos);
  }

  private async createAccountProofCreator() {
    if (this.accountProofCreator) {
      return;
    }
    const fft = await this.fftFactory.createFft(AccountProver.getCircuitSize(this.proverless));
    const unrolledProver = new UnrolledProver(
      this.workerPool ? this.workerPool.workers[0] : this.barretenberg,
      this.pippenger,
      fft,
    );
    this.accountProver = new AccountProver(unrolledProver, this.proverless);
    this.accountProofCreator = new AccountProofCreator(this.accountProver);
  }

  private async computeJoinSplitProvingKey(timeout?: number) {
    this.debug('release account proving key...');
    await this.accountProver?.releaseKey();
    this.debug('computing join-split proving key...');
    await this.joinSplitProver.computeKey(timeout);
    this.debug('done.');
  }

  private async computeAccountProvingKey(timeout?: number) {
    this.debug('release join-split proving key...');
    await this.joinSplitProver?.releaseKey();
    this.debug('computing account proving key...');
    await this.accountProver.computeKey(timeout);
    this.debug('done.');
  }
}
