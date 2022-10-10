import { AliasHash } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import moment from 'moment';
import { ClaimDao, RollupDao, RollupProofDao, TxDao } from '../entity/index.js';

const now = moment();

const txTypeToProofId = (txType: TxType) => {
  switch (txType) {
    case TxType.ACCOUNT:
      return ProofId.ACCOUNT;
    case TxType.DEFI_CLAIM:
      return ProofId.DEFI_CLAIM;
    case TxType.DEFI_DEPOSIT:
      return ProofId.DEFI_DEPOSIT;
    case TxType.DEPOSIT:
      return ProofId.DEPOSIT;
    case TxType.TRANSFER:
      return ProofId.SEND;
    case TxType.WITHDRAW_HIGH_GAS:
    case TxType.WITHDRAW_TO_WALLET:
      return ProofId.WITHDRAW;
  }
};

export const randomTx = ({
  txType = TxType.TRANSFER,
  nullifier1 = randomBytes(32),
  nullifier2 = randomBytes(32),
  signature = Buffer.alloc(0),
  accountPublicKey = GrumpkinAddress.random(),
  aliasHash = AliasHash.random(),
  creationTime = now.add(1, 's').toDate(),
} = {}) => {
  const proofId = txTypeToProofId(txType);
  const isPublic =
    txType == TxType.WITHDRAW_HIGH_GAS || txType == TxType.WITHDRAW_TO_WALLET || txType == TxType.DEPOSIT;
  const proofData = new ProofData(
    Buffer.concat([
      numToUInt32BE(proofId, 32),
      randomBytes(32),
      randomBytes(32),
      nullifier1,
      nullifier2,
      isPublic ? randomBytes(32) : Buffer.alloc(32),
      isPublic ? Buffer.concat([Buffer.alloc(12), EthAddress.random().toBuffer()]) : Buffer.alloc(32),
      isPublic ? Buffer.concat([Buffer.alloc(28), randomBytes(4)]) : Buffer.alloc(32),
    ]),
  );
  const offchainTxData =
    txType === TxType.ACCOUNT ? new OffchainAccountData(accountPublicKey, aliasHash).toBuffer() : randomBytes(160);
  return new TxDao({
    id: proofData.txId,
    proofData: proofData.rawProofData,
    offchainTxData,
    nullifier1: toBigIntBE(proofData.nullifier1) ? proofData.nullifier1 : undefined,
    nullifier2: toBigIntBE(proofData.nullifier2) ? proofData.nullifier2 : undefined,
    dataRootsIndex: 0,
    created: creationTime,
    signature: signature.length ? signature : undefined,
    txType,
    excessGas: 50000,
  });
};

export const randomAccountTx = ({
  accountPublicKey = GrumpkinAddress.random(),
  aliasHash = AliasHash.random(),
  migrate = false,
  addKey = false,
} = {}) =>
  randomTx({
    txType: TxType.ACCOUNT,
    accountPublicKey,
    aliasHash,
    nullifier1: !migrate && !addKey ? Buffer.concat([Buffer.alloc(4).fill(1), aliasHash.toBuffer()]) : Buffer.alloc(32),
    nullifier2: !addKey ? accountPublicKey.y() : Buffer.alloc(32),
  });

export const randomRollupProof = (txs: TxDao[], dataStartIndex = 0, rollupSize = txs.length) => {
  const encodedProofData = RollupProofData.randomData(
    0,
    txs.length,
    dataStartIndex,
    txs.map(tx => InnerProofData.fromBuffer(tx.proofData)),
  ).encode();
  return new RollupProofDao({
    id: randomBytes(32),
    txs,
    dataStartIndex,
    rollupSize,
    encodedProofData,
    created: new Date(),
  });
};

export const randomRollup = (rollupId: number, rollupProof: RollupProofDao) =>
  new RollupDao({
    id: rollupId,
    dataRoot: randomBytes(32),
    rollupProof,
    created: new Date(),
    assetMetrics: [],
    bridgeMetrics: [],
  });

export const randomClaim = () =>
  new ClaimDao({
    id: randomBytes(4).readUInt32BE(0),
    nullifier: randomBytes(32),
    bridgeId: BridgeCallData.random().toBigInt(), // TODO: rename bridgeId to bridgeCallData
    depositValue: toBigIntBE(randomBytes(32)),
    partialState: randomBytes(32),
    partialStateSecretEphPubKey: randomBytes(64),
    inputNullifier: randomBytes(32),
    interactionNonce: randomBytes(4).readUInt32BE(0),
    fee: toBigIntBE(randomBytes(32)),
    created: new Date(),
  });
