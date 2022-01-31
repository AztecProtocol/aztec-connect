import { AccountAliasId, AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
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

export const randomNote = (): Note => ({
  assetId: randomInt(),
  value: BigInt(randomInt()),
  commitment: randomBytes(32),
  secret: randomBytes(32),
  nullifier: randomBytes(32),
  nullified: false,
  owner: AccountId.random(),
  creatorPubKey: randomBytes(32),
  inputNullifier: randomBytes(32),
  index: randomInt(),
  allowChain: false,
  pending: false,
});

export const randomClaimTx = (): CoreClaimTx => ({
  nullifier: randomBytes(32),
  txId: TxId.random(),
  userId: AccountId.random(),
  secret: randomBytes(32),
});

export const randomUser = (): UserData => {
  const id = AccountId.random();
  return {
    id,
    privateKey: randomBytes(32),
    publicKey: id.publicKey,
    nonce: id.nonce,
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
    tx.outputValueA || BigInt(0),
    tx.outputValueB || BigInt(0),
    tx.result,
    tx.settled,
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
