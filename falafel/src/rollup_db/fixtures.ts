import { AccountAliasId, AliasHash } from '@aztec/barretenberg/account_id';
import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import { OffchainAccountData } from '@aztec/barretenberg/offchain_tx_data';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import moment from 'moment';
import { ClaimDao, RollupDao, RollupProofDao, TxDao } from '../entity';

const now = moment();

const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_TO_CONTRACT ? txType + 1 : txType);

export const randomTx = ({
  txType = TxType.TRANSFER,
  signature = Buffer.alloc(0),
  accountPublicKey = GrumpkinAddress.randomAddress(),
  aliasHash = AliasHash.random(),
  nonce = 1,
} = {}) => {
  const proofId = txTypeToProofId(txType);
  const proofData = new ProofData(
    Buffer.concat([numToUInt32BE(proofId, 32), randomBytes(32 * (ProofData.NUM_PUBLIC_INPUTS - 1))]),
  );
  const offchainTxData =
    txType === TxType.ACCOUNT
      ? new OffchainAccountData(accountPublicKey, new AccountAliasId(aliasHash, nonce)).toBuffer()
      : randomBytes(160);
  return new TxDao({
    id: proofData.txId,
    proofData: proofData.rawProofData,
    offchainTxData,
    nullifier1: toBigIntBE(proofData.nullifier1) ? proofData.nullifier1 : undefined,
    nullifier2: toBigIntBE(proofData.nullifier2) ? proofData.nullifier2 : undefined,
    dataRootsIndex: 0,
    created: now.add(1, 's').toDate(),
    signature: signature.length ? signature : undefined,
    txType,
    excessGas: 50000n,
  });
};

export const randomAccountTx = ({
  accountPublicKey = GrumpkinAddress.randomAddress(),
  aliasHash = AliasHash.random(),
  nonce = 1,
} = {}) =>
  randomTx({
    txType: TxType.ACCOUNT,
    accountPublicKey,
    aliasHash,
    nonce,
  });

export const randomRollupProof = (txs: TxDao[], dataStartIndex = 0, rollupSize = txs.length) =>
  new RollupProofDao({
    id: randomBytes(32),
    txs,
    dataStartIndex,
    rollupSize,
    proofData: RollupProofData.randomData(0, txs.length, dataStartIndex).toBuffer(),
    created: new Date(),
  });

export const randomRollup = (rollupId: number, rollupProof: RollupProofDao) =>
  new RollupDao({
    id: rollupId,
    dataRoot: randomBytes(32),
    rollupProof,
    created: new Date(),
    assetMetrics: [],
  });

export const randomClaim = () =>
  new ClaimDao({
    id: randomBytes(4).readUInt32BE(0),
    nullifier: randomBytes(32),
    bridgeId: BridgeId.random().toBigInt(),
    depositValue: toBigIntBE(randomBytes(32)),
    partialState: randomBytes(32),
    partialStateSecretEphPubKey: randomBytes(64),
    inputNullifier: randomBytes(32),
    interactionNonce: randomBytes(4).readUInt32BE(0),
    fee: toBigIntBE(randomBytes(32)),
    created: new Date(),
  });
