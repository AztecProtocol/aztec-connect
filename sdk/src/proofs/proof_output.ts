import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import {
  OffchainAccountData,
  OffchainDefiDepositData,
  OffchainJoinSplitData,
} from '@aztec/barretenberg/offchain_tx_data';
import {
  CoreAccountTx,
  CoreAccountTxJson,
  CoreDefiTx,
  CoreDefiTxJson,
  CorePaymentTx,
  CorePaymentTxJson,
  coreUserTxFromJson,
  coreUserTxToJson,
} from '../core_tx';
import { Note, noteFromJson, NoteJson, noteToJson } from '../note';

export interface ProofOutput {
  tx: CorePaymentTx | CoreAccountTx | CoreDefiTx;
  proofData: ProofData;
  offchainTxData: OffchainJoinSplitData | OffchainAccountData | OffchainDefiDepositData;
  outputNotes: Note[];
  signature?: Buffer;
}

export interface ProofOutputJson {
  tx: CorePaymentTxJson | CoreAccountTxJson | CoreDefiTxJson;
  proofData: Uint8Array;
  offchainTxData: Uint8Array;
  outputNotes: NoteJson[];
  signature?: Uint8Array;
}

export const proofOutputToJson = ({
  tx,
  proofData,
  offchainTxData,
  outputNotes,
  signature,
}: ProofOutput): ProofOutputJson => ({
  tx: coreUserTxToJson(tx),
  proofData: new Uint8Array(proofData.rawProofData),
  offchainTxData: new Uint8Array(offchainTxData.toBuffer()),
  outputNotes: outputNotes.map(n => noteToJson(n)),
  signature: signature ? new Uint8Array(signature) : undefined,
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

export const proofOutputFromJson = ({
  tx,
  proofData,
  offchainTxData,
  outputNotes,
  signature,
}: ProofOutputJson): ProofOutput => ({
  tx: coreUserTxFromJson(tx),
  proofData: new ProofData(Buffer.from(proofData)),
  offchainTxData: offchainTxDataFromBuffer(tx.proofId, Buffer.from(offchainTxData)),
  outputNotes: outputNotes.map(n => noteFromJson(n)),
  signature: signature ? Buffer.from(signature) : undefined,
});
