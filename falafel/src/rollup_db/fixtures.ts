import { EthAddress } from '@aztec/barretenberg/address';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofData, ProofId } from '@aztec/barretenberg/client_proofs';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { ViewingKey } from '@aztec/barretenberg/viewing_key';
import { toBigIntBE, toBufferBE } from '@aztec/barretenberg/bigint_buffer';
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

export const randomTx = ({ signature, inputOwner, publicInput, txType = TxType.DEPOSIT }: RandomTxOpts = {}) => {
  const proofId = Math.max(0, txType - 3);
  const proofData = new ProofData(
    Buffer.concat([
      numToUInt32BE(proofId, 32),
      publicInput ? toBufferBE(publicInput, 32) : randomBytes(32), // publicInput
      randomBytes(32), // publicOutput
      proofId === ProofId.JOIN_SPLIT ? Buffer.alloc(32) : randomBytes(32), // assetId / accountAliasId / bridgeId
      randomBytes(64), // note1
      randomBytes(64), // note2
      randomBytes(32), // nullifier1
      randomBytes(32), // nullifier2
      inputOwner ? inputOwner.toBuffer32() : Buffer.concat([Buffer.alloc(12), randomBytes(20)]),
      Buffer.concat([Buffer.alloc(12), randomBytes(20)]),
    ]),
  );
  return new TxDao({
    id: proofData.txId,
    proofData: proofData.rawProofData,
    viewingKey1: ViewingKey.random(),
    viewingKey2: ViewingKey.random(),
    nullifier1: proofData.nullifier1,
    nullifier2: proofData.nullifier2,
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
      [randomBytes(32), randomBytes(32), randomBytes(32), randomBytes(32)],
      [Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32)],
      [
        new InnerProofData(
          0,
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
          randomBytes(64),
          randomBytes(64),
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
          randomBytes(32),
        ),
      ],
      randomBytes(32),
      [randomBytes(64), randomBytes(64), randomBytes(64), randomBytes(64)],
      randomBytes(32),
      [],
    ).toBuffer(),
    created: new Date(),
  });

export const randomRollup = (rollupId: number, rollupProof: RollupProofDao) =>
  new RollupDao({
    id: rollupId,
    dataRoot: randomBytes(32),
    rollupProof,
    viewingKeys: Buffer.concat(
      rollupProof.txs
        .map(tx => [tx.viewingKey1, tx.viewingKey2])
        .flat()
        .map(vk => vk.toBuffer()),
    ),
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
    created: new Date(),
  });
