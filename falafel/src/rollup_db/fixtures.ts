import { EthAddress } from 'barretenberg/address';
import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { InnerProofData, RollupProofData } from 'barretenberg/rollup_proof';
import { ViewingKey } from 'barretenberg/viewing_key';
import { toBufferBE } from 'bigint-buffer';
import { randomBytes } from 'crypto';
import { RollupDao, RollupProofDao, TxDao } from '../entity';
import moment from 'moment';
import { TxType } from 'barretenberg/blockchain';

const now = moment();

interface RandomTxOpts {
  signature?: Buffer;
  inputOwner?: EthAddress;
  publicInput?: bigint;
  txType?: TxType;
}

export const randomTx = ({ signature, inputOwner, publicInput, txType }: RandomTxOpts = {}) => {
  const proofData = new ProofData(
    Buffer.concat([
      Buffer.alloc(32), // proofId
      publicInput ? toBufferBE(publicInput, 32) : randomBytes(32), // publicInput
      randomBytes(32), // publicOutput
      txType === TxType.ACCOUNT ? randomBytes(32) : Buffer.alloc(32), // assetId
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
    txType: txType || TxType.DEPOSIT,
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
      [Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32)],
      1,
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
