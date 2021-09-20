import { EthAddress } from '@aztec/barretenberg/address';
import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import moment from 'moment';
import { ClaimDao } from '../entity/claim';
import { RollupDao } from '../entity/rollup';
import { RollupProofDao } from '../entity/rollup_proof';
import { TxDao } from '../entity/tx';

const now = moment();

interface RandomTxOpts {
  signature?: Buffer;
  inputOwner?: EthAddress;
  publicInput?: bigint;
  txType?: TxType;
}

const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_TO_CONTRACT ? txType + 1 : txType);

export const randomTx = ({ signature, inputOwner, publicInput, txType = TxType.DEPOSIT }: RandomTxOpts = {}) => {
  const proofId = txTypeToProofId(txType);
  const proofData = new ProofData(
    Buffer.concat([
      numToUInt32BE(proofId, 32),
      randomBytes(32), // note1
      randomBytes(32), // note2
      randomBytes(32), // nullifier1
      randomBytes(32), // nullifier2
      publicInput ? toBufferBE(publicInput, 32) : randomBytes(32), // publicInput
      randomBytes(32), // publicOutput
      randomBytes(32), // assetId / accountAliasId / bridgeId
      inputOwner ? inputOwner.toBuffer32() : Buffer.concat([Buffer.alloc(12), randomBytes(20)]),
      Buffer.concat([Buffer.alloc(12), randomBytes(20)]),
    ]),
  );
  return new TxDao({
    id: proofData.txId,
    proofData: proofData.rawProofData,
    offchainTxData: randomBytes(160),
    nullifier1: toBigIntBE(proofData.nullifier1) ? proofData.nullifier1 : undefined,
    nullifier2: toBigIntBE(proofData.nullifier2) ? proofData.nullifier2 : undefined,
    dataRootsIndex: 0,
    created: now.add(1, 's').toDate(),
    signature,
    txType,
  });
};

export const randomRollupProof = (txs: TxDao[], dataStartIndex = 0, rollupSize = txs.length) =>
  new RollupProofDao({
    id: randomBytes(32),
    txs,
    dataStartIndex,
    rollupSize,
    proofData: new RollupProofData(
      dataStartIndex,
      rollupSize,
      dataStartIndex,
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      randomBytes(32),
      [randomBytes(32), randomBytes(32), randomBytes(32), randomBytes(32)],
      [randomBytes(32), randomBytes(32), randomBytes(32), randomBytes(32)],
      [
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
        randomBytes(32),
      ],
      [
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
        Buffer.alloc(32),
      ],
      [randomBytes(64), randomBytes(64), randomBytes(64), randomBytes(64)],
      randomBytes(32),
      1,
      [
        new InnerProofData(
          0,
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
        ),
      ],
    ).toBuffer(),
    created: new Date(),
  });

export const randomRollup = (rollupId: number, rollupProof: RollupProofDao) =>
  new RollupDao({
    id: rollupId,
    dataRoot: randomBytes(32),
    rollupProof,
    created: new Date(),
  });

export const randomClaim = () =>
  new ClaimDao({
    id: randomBytes(4).readUInt32BE(0),
    nullifier: randomBytes(32),
    bridgeId: BridgeId.random().toBigInt(),
    depositValue: toBigIntBE(randomBytes(32)),
    partialState: randomBytes(32),
    interactionNonce: randomBytes(4).readUInt32BE(0),
    fee: toBigIntBE(randomBytes(32)),
    created: new Date(),
  });
