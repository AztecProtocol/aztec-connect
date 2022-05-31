import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TreeNote } from '@aztec/barretenberg/note_algorithms';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomBytes } from 'crypto';
import { CoreAccountTx, CoreClaimTx, CoreDefiTx, CorePaymentTx } from '../../core_tx';
import { Note } from '../../note';
import { UserData } from '../../user';
import { Alias, SpendingKey } from '../database';

export const randomInt = () => {
  return Math.floor(Math.random() * 2 ** 32);
};

const inputOrDefault = <T>(inputValue: T | undefined, defaultValue: T) =>
  inputValue !== undefined ? inputValue : defaultValue;

export const randomNote = (note: Partial<Note> = {}, treeNote: Partial<TreeNote> = {}) =>
  new Note(
    note.treeNote ||
      new TreeNote(
        treeNote.ownerPubKey || GrumpkinAddress.random(),
        inputOrDefault(treeNote.value, BigInt(randomInt())),
        inputOrDefault(treeNote.assetId, randomInt()),
        treeNote.accountRequired || false,
        treeNote.noteSecret || randomBytes(32),
        treeNote.creatorPubKey || randomBytes(32),
        treeNote.inputNullifier || randomBytes(32),
      ),
    note.commitment || randomBytes(32),
    note.nullifier || randomBytes(32),
    note.allowChain || false,
    note.nullified || false,
    note.index,
    note.hashPath || randomBytes(32),
  );

export const randomClaimTx = (): CoreClaimTx => ({
  nullifier: randomBytes(32),
  defiTxId: TxId.random(),
  userId: GrumpkinAddress.random(),
  secret: randomBytes(32),
  interactionNonce: randomInt(),
});

export const randomUser = (user: Partial<UserData> = {}): UserData => {
  const id = user.id || GrumpkinAddress.random();
  return {
    id,
    accountPublicKey: id,
    accountPrivateKey: user.accountPrivateKey || randomBytes(32),
    syncedToRollup: user.syncedToRollup ?? randomInt(),
  };
};

export const randomAccountTx = (tx: Partial<CoreAccountTx> = {}) =>
  new CoreAccountTx(
    tx.txId || TxId.random(),
    tx.userId || GrumpkinAddress.random(),
    tx.aliasHash || AliasHash.random(),
    tx.newSpendingPublicKey1 || randomBytes(32),
    tx.newSpendingPublicKey2 || randomBytes(32),
    tx.migrated || false,
    inputOrDefault(tx.txRefNo, randomInt()),
    tx.created || new Date(),
    tx.settled,
  );

export const randomPaymentTx = (tx: Partial<CorePaymentTx> = {}) =>
  new CorePaymentTx(
    tx.txId || TxId.random(),
    tx.userId || GrumpkinAddress.random(),
    inputOrDefault(tx.proofId, ProofId.SEND),
    inputOrDefault(tx.assetId, randomInt()),
    inputOrDefault(tx.publicValue, BigInt(randomInt())),
    tx.publicOwner || EthAddress.random(),
    inputOrDefault(tx.privateInput, BigInt(randomInt())),
    inputOrDefault(tx.recipientPrivateOutput, BigInt(randomInt())),
    inputOrDefault(tx.senderPrivateOutput, BigInt(randomInt())),
    inputOrDefault(tx.isRecipient, true),
    inputOrDefault(tx.isSender, true),
    inputOrDefault(tx.txRefNo, randomInt()),
    tx.created || new Date(),
    tx.settled,
  );

export const randomDefiTx = (tx: Partial<CoreDefiTx> = {}) =>
  new CoreDefiTx(
    tx.txId || TxId.random(),
    tx.userId || GrumpkinAddress.random(),
    tx.bridgeId || BridgeId.random(),
    inputOrDefault(tx.depositValue, BigInt(randomInt())),
    inputOrDefault(tx.txFee, BigInt(randomInt())),
    tx.partialStateSecret || randomBytes(32),
    inputOrDefault(tx.txRefNo, randomInt()),
    tx.created || new Date(),
    tx.settled,
    tx.interactionNonce,
    tx.isAsync,
    tx.success,
    tx.outputValueA,
    tx.outputValueB,
    tx.finalised,
    tx.claimSettled,
  );

export const randomSpendingKey = (spendingKey: Partial<SpendingKey> = {}): SpendingKey => ({
  userId: spendingKey.userId || GrumpkinAddress.random(),
  key: spendingKey.key || randomBytes(32),
  treeIndex: inputOrDefault(spendingKey.treeIndex, randomInt()),
  hashPath: spendingKey.hashPath || randomBytes(32),
});

export const randomAlias = (alias: Partial<Alias> = {}) =>
  new Alias(
    alias.accountPublicKey || GrumpkinAddress.random(),
    alias.aliasHash || AliasHash.random(),
    alias.index ?? randomInt(),
  );
