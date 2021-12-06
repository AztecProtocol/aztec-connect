import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { randomBytes } from 'crypto';
import { Note } from '../../note';
import { AccountAliasId, AccountId, UserData } from '../../user';
import { UserAccountTx, UserDefiTx, UserJoinSplitTx, UserUtilTx } from '../../user_tx';
import { Claim } from '../claim';
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

export const randomClaim = (): Claim => ({
  nullifier: randomBytes(32),
  txHash: TxHash.random(),
  secret: randomBytes(32),
  owner: AccountId.random(),
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

export const randomUserAccountTx = (tx: Partial<UserAccountTx> = {}) =>
  new UserAccountTx(
    tx.txHash || TxHash.random(),
    tx.userId || AccountId.random(),
    tx.aliasHash || AliasHash.random(),
    tx.newSigningPubKey1 || randomBytes(32),
    tx.newSigningPubKey2 || randomBytes(32),
    tx.migrated || false,
    tx.created || new Date(),
    tx.settled,
  );

export const randomUserJoinSplitTx = (tx: Partial<UserJoinSplitTx> = {}) =>
  new UserJoinSplitTx(
    tx.txHash || TxHash.random(),
    tx.userId || AccountId.random(),
    inputOrDefault(tx.assetId, randomInt()),
    inputOrDefault(tx.publicInput, BigInt(randomInt())),
    inputOrDefault(tx.publicOutput, BigInt(randomInt())),
    inputOrDefault(tx.privateInput, BigInt(randomInt())),
    inputOrDefault(tx.recipientPrivateOutput, BigInt(randomInt())),
    inputOrDefault(tx.senderPrivateOutput, BigInt(randomInt())),
    tx.inputOwner || EthAddress.randomAddress(),
    tx.outputOwner || EthAddress.randomAddress(),
    inputOrDefault(tx.ownedByUser, true),
    tx.created || new Date(),
    tx.settled,
  );

export const randomUserDefiTx = (tx: Partial<UserDefiTx> = {}) =>
  new UserDefiTx(
    tx.txHash || TxHash.random(),
    tx.userId || AccountId.random(),
    tx.bridgeId || BridgeId.random(),
    inputOrDefault(tx.depositValue, BigInt(randomInt())),
    tx.partialStateSecret || randomBytes(32),
    inputOrDefault(tx.txFee, BigInt(randomInt())),
    tx.created || new Date(),
    tx.outputValueA || BigInt(0),
    tx.outputValueB || BigInt(0),
    tx.settled,
  );

export const randomUserUtilTx = (tx: Partial<UserUtilTx> = {}) =>
  new UserUtilTx(
    tx.txHash || TxHash.random(),
    tx.userId || AccountId.random(),
    inputOrDefault(tx.assetId, randomInt()),
    inputOrDefault(tx.txFee, BigInt(randomInt())),
    tx.forwardLink || randomBytes(32),
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
