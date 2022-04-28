import { AccountAliasId, AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TreeNote } from '@aztec/barretenberg/note_algorithms';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomBytes } from 'crypto';
import { CoreAccountTx, CoreClaimTx, CoreDefiTx, CorePaymentTx } from '../../core_tx';
import { Note } from '../../note';
import { UserData } from '../../user';
import { Alias, SigningKey } from '../database';

export const randomInt = () => {
  return Math.floor(Math.random() * 2 ** 32);
};

const inputOrDefault = <T>(inputValue: T | undefined, defaultValue: T) =>
  inputValue !== undefined ? inputValue : defaultValue;

export const randomNote = (note: Partial<Note> = {}, treeNote: Partial<TreeNote> = {}) =>
  new Note(
    note.treeNote ||
      new TreeNote(
        treeNote.ownerPubKey || GrumpkinAddress.randomAddress(),
        inputOrDefault(treeNote.value, BigInt(randomInt())),
        inputOrDefault(treeNote.assetId, randomInt()),
        inputOrDefault(treeNote.nonce, randomInt()),
        treeNote.noteSecret || randomBytes(32),
        treeNote.creatorPubKey || randomBytes(32),
        treeNote.inputNullifier || randomBytes(32),
      ),
    note.commitment || randomBytes(32),
    note.nullifier || randomBytes(32),
    note.allowChain || false,
    note.nullified || false,
    note.index,
  );

export const randomClaimTx = (): CoreClaimTx => ({
  nullifier: randomBytes(32),
  defiTxId: TxId.random(),
  userId: AccountId.random(),
  secret: randomBytes(32),
  interactionNonce: randomInt(),
});

export const randomUser = (): UserData => {
  const id = AccountId.random();
  return {
    id,
    privateKey: randomBytes(32),
    publicKey: id.publicKey,
    nonce: id.accountNonce,
    aliasHash: AliasHash.random(),
    syncedToRollup: randomInt(),
  };
};

export const randomAccountTx = (tx: Partial<CoreAccountTx> = {}) =>
  new CoreAccountTx(
    tx.txId || TxId.random(),
    tx.userId || AccountId.random(),
    tx.aliasHash || AliasHash.random(),
    tx.newSigningPubKey1 || randomBytes(32),
    tx.newSigningPubKey2 || randomBytes(32),
    tx.migrated || false,
    inputOrDefault(tx.txRefNo, randomInt()),
    tx.created || new Date(),
    tx.settled,
  );

export const randomPaymentTx = (tx: Partial<CorePaymentTx> = {}) =>
  new CorePaymentTx(
    tx.txId || TxId.random(),
    tx.userId || AccountId.random(),
    inputOrDefault(tx.proofId, ProofId.SEND),
    inputOrDefault(tx.assetId, randomInt()),
    inputOrDefault(tx.publicValue, BigInt(randomInt())),
    tx.publicOwner || EthAddress.randomAddress(),
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
    tx.userId || AccountId.random(),
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

export const randomAccountAliasId = () => new AccountAliasId(AliasHash.random(), randomInt());

export const randomSigningKey = (): SigningKey => ({
  accountId: AccountId.random(),
  key: randomBytes(32),
  treeIndex: randomInt(),
});

export const randomAlias = (): Alias => ({
  aliasHash: AliasHash.random(),
  address: GrumpkinAddress.randomAddress(),
  latestNonce: randomInt(),
});
