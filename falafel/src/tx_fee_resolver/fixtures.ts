import { AssetId } from '@aztec/barretenberg/asset';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { ProofData } from '@aztec/barretenberg/client_proofs';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import { TxDao } from '../entity/tx';

const txTypeToProofId = (txType: TxType) => (txType < TxType.WITHDRAW_TO_CONTRACT ? txType + 1 : txType);

export const mockTx = (txFeeAssetId: AssetId, txType: TxType, txFee: bigint) =>
  ({
    txType,
    proofData: Buffer.concat([
      numToUInt32BE(txTypeToProofId(txType), 32),
      randomBytes(8 * 32),
      toBufferBE(txFee, 32),
      numToUInt32BE(txFeeAssetId, 32),
      randomBytes((ProofData.NUM_PUBLIC_INPUTS - 11) * 32),
    ]),
  } as any as TxDao);
