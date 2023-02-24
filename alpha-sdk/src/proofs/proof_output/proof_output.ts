import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import {
  OffchainAccountData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import { Tx } from '@aztec/barretenberg/rollup_provider';
import {
  CoreAccountTx,
  CoreAccountTxJson,
  CoreDefiTx,
  CoreDefiTxJson,
  CorePaymentTx,
  CorePaymentTxJson,
  coreUserTxFromJson,
  coreUserTxToJson,
} from '../../core_tx/index.js';
import { Note, noteFromJson, NoteJson, noteToJson } from '../../note/index.js';

export interface ProofOutput {
  tx: CorePaymentTx | CoreAccountTx | CoreDefiTx;
  proofData: ProofData;
  offchainTxData: OffchainJoinSplitData | OffchainAccountData | OffchainDefiDepositData;
  outputNotes: Note[];
}

export interface ProofOutputJson {
  tx: CorePaymentTxJson | CoreAccountTxJson | CoreDefiTxJson;
  proofData: string;
  offchainTxData: string;
  outputNotes: NoteJson[];
}

export const proofOutputToJson = ({ tx, proofData, offchainTxData, outputNotes }: ProofOutput): ProofOutputJson => ({
  tx: coreUserTxToJson(tx),
  proofData: proofData.rawProofData.toString('base64'),
  offchainTxData: offchainTxData.toBuffer().toString('base64'),
  outputNotes: outputNotes.map(n => noteToJson(n)),
});

const offchainTxDataFromBuffer = (proofId: ProofId, buf: Buffer) => {
  switch (proofId) {
    case ProofId.DEPOSIT:
    case ProofId.WITHDRAW:
    case ProofId.SEND:
      return OffchainJoinSplitData.fromBuffer(buf);
    case ProofId.ACCOUNT:
      return OffchainAccountData.fromBuffer(buf);
    case ProofId.DEFI_DEPOSIT:
      return OffchainDefiDepositData.fromBuffer(buf);
    default:
      throw new Error(`Unsupported ProofOutput proofId: ${proofId}`);
  }
};

export const proofOutputFromJson = ({ tx, proofData, offchainTxData, outputNotes }: ProofOutputJson): ProofOutput => ({
  tx: coreUserTxFromJson(tx),
  proofData: new ProofData(Buffer.from(proofData, 'base64')),
  offchainTxData: offchainTxDataFromBuffer(tx.proofId, Buffer.from(offchainTxData, 'base64')),
  outputNotes: outputNotes.map(n => noteFromJson(n)),
});

export const proofOutputToProofTx = ({ proofData, offchainTxData }: ProofOutput, depositSignature?: Buffer): Tx => ({
  proofData: proofData.rawProofData,
  offchainTxData: offchainTxData.toBuffer(),
  depositSignature,
});
