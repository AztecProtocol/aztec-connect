import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { JoinSplitTx } from '@aztec/barretenberg/client_proofs';
import { HashPath } from '@aztec/barretenberg/merkle_tree';
import { ClaimNoteTxData } from '@aztec/barretenberg/note_algorithms';
import { Note, noteFromJson, NoteJson, noteToJson } from '../../note/index.js';

export interface JoinSplitTxInput {
  proofId: number;
  publicValue: bigint;
  publicOwner: EthAddress;
  inputNotes: Note[];
  outputNotes: Note[];
  claimNote: ClaimNoteTxData;
  spendingPublicKey: GrumpkinAddress;
  aliasHash: AliasHash;
  accountIndex: number;
  accountPath: HashPath;
  dataRoot: Buffer;
  backwardLink: Buffer;
  allowChain: number;
}

export interface JoinSplitTxInputJson {
  proofId: number;
  publicValue: string;
  publicOwner: string;
  inputNotes: NoteJson[];
  outputNotes: NoteJson[];
  claimNote: Uint8Array;
  spendingPublicKey: string;
  aliasHash: string;
  accountIndex: number;
  accountPath: Uint8Array;
  dataRoot: Uint8Array;
  backwardLink: Uint8Array;
  allowChain: number;
}

export const joinSplitTxInputToJson = ({
  publicValue,
  publicOwner,
  inputNotes,
  outputNotes,
  claimNote,
  spendingPublicKey,
  aliasHash,
  accountPath,
  dataRoot,
  backwardLink,
  ...rest
}: JoinSplitTxInput): JoinSplitTxInputJson => ({
  publicValue: publicValue.toString(),
  publicOwner: publicOwner.toString(),
  inputNotes: inputNotes.map(noteToJson),
  outputNotes: outputNotes.map(noteToJson),
  claimNote: new Uint8Array(claimNote.toBuffer()),
  spendingPublicKey: spendingPublicKey.toString(),
  aliasHash: aliasHash.toString(),
  accountPath: new Uint8Array(accountPath.toBuffer()),
  dataRoot: new Uint8Array(dataRoot),
  backwardLink: new Uint8Array(backwardLink),
  ...rest,
});

export const joinSplitTxInputFromJson = ({
  publicValue,
  publicOwner,
  inputNotes,
  outputNotes,
  claimNote,
  spendingPublicKey,
  aliasHash,
  accountPath,
  dataRoot,
  backwardLink,
  ...rest
}: JoinSplitTxInputJson): JoinSplitTxInput => ({
  publicValue: BigInt(publicValue),
  publicOwner: EthAddress.fromString(publicOwner),
  inputNotes: inputNotes.map(noteFromJson),
  outputNotes: outputNotes.map(noteFromJson),
  claimNote: ClaimNoteTxData.fromBuffer(Buffer.from(claimNote)),
  spendingPublicKey: GrumpkinAddress.fromString(spendingPublicKey),
  aliasHash: AliasHash.fromString(aliasHash),
  accountPath: HashPath.fromBuffer(Buffer.from(accountPath)),
  dataRoot: Buffer.from(dataRoot),
  backwardLink: Buffer.from(backwardLink),
  ...rest,
});

export const toJoinSplitTx = (tx: JoinSplitTxInput, accountPrivateKey: Buffer) => {
  const numInputNotes = tx.inputNotes.reduce((count, n) => count + (n.value ? 1 : 0), 0);
  const assetId = tx.inputNotes[0].assetId;
  const accountRequired = !tx.inputNotes[0].owner.equals(tx.spendingPublicKey);
  return new JoinSplitTx(
    tx.proofId,
    tx.publicValue,
    tx.publicOwner,
    assetId,
    numInputNotes,
    tx.inputNotes.map(n => n.index || 0),
    tx.dataRoot,
    tx.inputNotes.map(n => HashPath.fromBuffer(n.hashPath!)),
    tx.inputNotes.map(n => n.treeNote),
    tx.outputNotes.map(n => n.treeNote),
    tx.claimNote,
    accountPrivateKey,
    tx.aliasHash,
    accountRequired,
    tx.accountIndex,
    tx.accountPath,
    tx.spendingPublicKey,
    tx.backwardLink,
    tx.allowChain,
  );
};
