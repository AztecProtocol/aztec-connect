import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AccountTx, JoinSplitTx, ProofData } from '@aztec/barretenberg/client_proofs';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { NoteAlgorithms } from '@aztec/barretenberg/note_algorithms';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { treeNoteToNote } from '../note/index.js';
import { JoinSplitTxInput } from './proof_input/index.js';

export interface AccountProofInput {
  tx: AccountTx;
  signingData: Buffer;
  signature?: SchnorrSignature;
}

export interface AccountProofInputJson {
  tx: Uint8Array;
  signingData: Uint8Array;
  signature?: string;
}

export const accountProofInputToJson = ({ tx, signingData, signature }: AccountProofInput): AccountProofInputJson => ({
  tx: new Uint8Array(tx.toBuffer()),
  signingData: new Uint8Array(signingData),
  signature: signature ? signature.toString() : undefined,
});

export const accountProofInputFromJson = ({
  tx,
  signingData,
  signature,
}: AccountProofInputJson): AccountProofInput => ({
  tx: AccountTx.fromBuffer(Buffer.from(tx)),
  signingData: Buffer.from(signingData),
  signature: signature ? SchnorrSignature.fromString(signature) : undefined,
});

export interface JoinSplitProofInput {
  tx: JoinSplitTx;
  viewingKeys: ViewingKey[];
  partialStateSecretEphPubKey?: GrumpkinAddress;
  signingData: Buffer;
  signature?: SchnorrSignature;
}

export interface JoinSplitProofInputJson {
  tx: Uint8Array;
  viewingKeys: string[];
  partialStateSecretEphPubKey?: string;
  signingData: Uint8Array;
  signature?: string;
}

export const joinSplitProofInputToJson = ({
  tx,
  viewingKeys,
  partialStateSecretEphPubKey,
  signingData,
  signature,
}: JoinSplitProofInput): JoinSplitProofInputJson => ({
  tx: new Uint8Array(tx.toBuffer()),
  viewingKeys: viewingKeys.map(vk => vk.toString()),
  partialStateSecretEphPubKey: partialStateSecretEphPubKey ? partialStateSecretEphPubKey.toString() : undefined,
  signingData: new Uint8Array(signingData),
  signature: signature ? signature.toString() : undefined,
});

export const joinSplitProofInputFromJson = ({
  tx,
  viewingKeys,
  partialStateSecretEphPubKey,
  signingData,
  signature,
}: JoinSplitProofInputJson): JoinSplitProofInput => ({
  tx: JoinSplitTx.fromBuffer(Buffer.from(tx)),
  viewingKeys: viewingKeys.map(vk => ViewingKey.fromString(vk)),
  partialStateSecretEphPubKey: partialStateSecretEphPubKey
    ? GrumpkinAddress.fromString(partialStateSecretEphPubKey)
    : undefined,
  signingData: Buffer.from(signingData),
  signature: signature ? SchnorrSignature.fromString(signature) : undefined,
});

export const joinSplitTxInputToJoinSplitTx = (
  txInput: JoinSplitTxInput,
  accountPrivateKey: Buffer,
  accountPublicKey: GrumpkinAddress,
) =>
  new JoinSplitTx(
    txInput.proofId,
    txInput.publicValue,
    txInput.publicOwner,
    (txInput.inputNotes[0] || txInput.outputNotes[0]).assetId,
    txInput.inputNotes.reduce((count, n) => count + (n.value ? 1 : 0), 0),
    txInput.inputNotes.map(n => n.index || 0),
    txInput.dataRoot,
    txInput.inputNotes.map(n => HashPath.fromBuffer(n.hashPath!)),
    txInput.inputNotes.map(n => n.treeNote),
    txInput.outputNotes.map(n => n.treeNote),
    txInput.claimNote,
    accountPrivateKey,
    txInput.aliasHash,
    !txInput.spendingPublicKey.equals(accountPublicKey),
    txInput.accountIndex,
    txInput.accountPath,
    txInput.spendingPublicKey,
    txInput.backwardLink,
    txInput.allowChain,
  );

export const joinSplitTxToJoinSplitTxInput = (
  tx: JoinSplitTx,
  accountPrivateKey: Buffer,
  noteAlgos: NoteAlgorithms,
): JoinSplitTxInput => ({
  proofId: tx.proofId,
  publicValue: tx.publicValue,
  publicOwner: tx.publicOwner,
  inputNotes: tx.inputNotes.map((n, i) =>
    treeNoteToNote(n, accountPrivateKey, noteAlgos, {
      gibberish: i >= tx.numInputNotes,
      index: tx.inputNoteIndices[i],
      hashPath: tx.inputNotePaths[i].toBuffer(),
    }),
  ),
  outputNotes: tx.outputNotes.map((n, i) =>
    treeNoteToNote(n, accountPrivateKey, noteAlgos, {
      allowChain: !i ? ProofData.allowChainFromNote1(tx.allowChain) : ProofData.allowChainFromNote2(tx.allowChain),
    }),
  ),
  claimNote: tx.claimNote,
  spendingPublicKey: tx.spendingPublicKey,
  aliasHash: tx.aliasHash,
  accountIndex: tx.accountIndex,
  accountPath: tx.accountPath,
  dataRoot: tx.merkleRoot,
  backwardLink: tx.backwardLink,
  allowChain: tx.allowChain,
});
