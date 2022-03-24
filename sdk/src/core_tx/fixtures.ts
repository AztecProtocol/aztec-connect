import { AccountId, AliasHash } from '@aztec/barretenberg/account_id';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { TxId } from '@aztec/barretenberg/tx_id';
import { randomBytes } from 'crypto';
import { CoreDefiTx } from './core_defi_tx';
import { CoreAccountTx } from './core_account_tx';
import { CorePaymentTx } from './core_payment_tx';
import { BridgeId } from '@aztec/barretenberg/bridge_id';

const inputOrDefault = <T>(inputValue: T | undefined, defaultValue: T) =>
  inputValue !== undefined ? inputValue : defaultValue;

export const randomCoreAccountTx = (tx: Partial<CoreAccountTx> = {}) =>
  new CoreAccountTx(
    tx.txId || TxId.random(),
    tx.userId || AccountId.random(),
    tx.aliasHash || AliasHash.random(),
    tx.newSigningPubKey1 || randomBytes(32),
    tx.newSigningPubKey2 || randomBytes(32),
    tx.migrated || false,
    tx.txRefNo || 0,
    tx.created || new Date(),
    tx.settled,
  );

export const randomCorePaymentTx = (tx: Partial<CorePaymentTx> = {}) =>
  new CorePaymentTx(
    tx.txId || TxId.random(),
    tx.userId || AccountId.random(),
    inputOrDefault(tx.proofId, ProofId.SEND),
    tx.assetId || 0,
    tx.publicValue || BigInt(0),
    tx.publicOwner || undefined,
    tx.privateInput || BigInt(0),
    tx.recipientPrivateOutput || BigInt(0),
    tx.senderPrivateOutput || BigInt(0),
    inputOrDefault(tx.isRecipient, true),
    inputOrDefault(tx.isSender, true),
    tx.txRefNo || 0,
    tx.created || new Date(),
    tx.settled,
  );

export const randomCoreDefiTx = (tx: Partial<CoreDefiTx> = {}) =>
  new CoreDefiTx(
    tx.txId || TxId.random(),
    tx.userId || AccountId.random(),
    tx.bridgeId || BridgeId.random(),
    inputOrDefault(tx.depositValue, toBigIntBE(randomBytes(4))),
    inputOrDefault(tx.txFee, toBigIntBE(randomBytes(4))),
    randomBytes(32),
    tx.txRefNo || 0,
    tx.created || new Date(),
    tx.outputValueA,
    tx.outputValueB,
    tx.result,
    tx.settled,
    tx.interactionNonce,
    tx.isAsync,
  );
