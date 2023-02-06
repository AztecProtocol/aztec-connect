import { Pedersen } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { AuthAlgorithms } from '../../auth_algorithms/index.js';
import {
  AccountProofRequestData,
  DefiProofRequestData,
  PaymentProofRequestData,
  ProofRequestData,
} from '../proof_request_data/index.js';
import { AccountProofInputCreator } from './account_proof_input_creator.js';
import { DefiProofInputCreator } from './defi_proof_input_creator.js';
import { JoinSplitTxInputCreator } from './join_split_tx_input_creator.js';
import { PaymentProofInputCreator } from './payment_proof_input_creator.js';
import { ProofInput } from './proof_input.js';

export class ProofInputFactory {
  private paymentProofInputCreator: PaymentProofInputCreator;
  private accountProofInputCreator: AccountProofInputCreator;
  private defiProofInputCreator: DefiProofInputCreator;

  constructor(noteAlgos: NoteAlgorithms, grumpkin: Grumpkin, pedesen: Pedersen, wasm: BarretenbergWasm) {
    const joinSplitTxInputCreator = new JoinSplitTxInputCreator(noteAlgos, grumpkin, pedesen);
    this.paymentProofInputCreator = new PaymentProofInputCreator(joinSplitTxInputCreator);
    this.accountProofInputCreator = new AccountProofInputCreator(this.paymentProofInputCreator, wasm);
    this.defiProofInputCreator = new DefiProofInputCreator(joinSplitTxInputCreator, this.paymentProofInputCreator);
  }

  public async createProofInputs(proofRequestData: ProofRequestData, authAlgos: AuthAlgorithms): Promise<ProofInput[]> {
    if (Object.prototype.hasOwnProperty.call(proofRequestData, 'bridgeCallData')) {
      return await this.defiProofInputCreator.createProofInputs(proofRequestData as DefiProofRequestData, authAlgos);
    } else if (Object.prototype.hasOwnProperty.call(proofRequestData, 'newAccountPublicKey')) {
      return await this.accountProofInputCreator.createProofInputs(
        proofRequestData as AccountProofRequestData,
        authAlgos,
      );
    } else {
      return await this.paymentProofInputCreator.createProofInputs(
        proofRequestData as PaymentProofRequestData,
        authAlgos,
      );
    }
  }
}
