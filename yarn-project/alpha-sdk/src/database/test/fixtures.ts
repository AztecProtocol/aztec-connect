import { AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { TreeNote } from '@aztec/barretenberg/note_algorithms';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomBytes } from 'crypto';
import { CoreClaimTx } from '../../core_tx/index.js';
import { randomCoreAccountTx, randomCoreDefiTx, randomCorePaymentTx } from '../../core_tx/fixtures.js';
import { Note } from '../../note/index.js';
import { AccountData, Alias, SpendingKey } from '../database.js';

export const randomInt = () => {
  return Math.floor(Math.random() * 2 ** 32);
};

export const randomNote = (note: Partial<Note> = {}, treeNote: Partial<TreeNote> = {}) =>
  new Note(
    note.treeNote ||
      new TreeNote(
        treeNote.ownerPubKey || GrumpkinAddress.random(),
        treeNote.value ?? BigInt(randomInt()),
        treeNote.assetId ?? randomInt(),
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
  accountPublicKey: GrumpkinAddress.random(),
  partialState: randomBytes(32),
  secret: randomBytes(32),
  interactionNonce: randomInt(),
});

export const randomUser = (user: Partial<AccountData> = {}): AccountData => ({
  accountPublicKey: user.accountPublicKey || GrumpkinAddress.random(),
  syncedToRollup: user.syncedToRollup ?? randomInt(),
});

export const randomAccountTx = randomCoreAccountTx;

export const randomPaymentTx = randomCorePaymentTx;

export const randomDefiTx = randomCoreDefiTx;

export const randomSpendingKey = (spendingKey: Partial<SpendingKey> = {}): SpendingKey => ({
  accountPublicKey: spendingKey.accountPublicKey || GrumpkinAddress.random(),
  key: spendingKey.key || randomBytes(32),
  treeIndex: spendingKey.treeIndex ?? randomInt(),
  hashPath: spendingKey.hashPath || randomBytes(32),
});

export const randomAlias = (alias: Partial<Alias> = {}) =>
  new Alias(
    alias.accountPublicKey || GrumpkinAddress.random(),
    alias.aliasHash || AliasHash.random(),
    alias.index ?? randomInt(),
  );
