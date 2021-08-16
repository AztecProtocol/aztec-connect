import { AssetId } from 'barretenberg/asset';
import { TxType } from 'barretenberg/blockchain';
import { ProofData } from 'barretenberg/client_proofs/proof_data';
import { numToUInt32BE } from 'barretenberg/serialize';
import { toBufferBE } from 'bigint-buffer';
import { randomBytes } from 'crypto';
import { TxDao } from '../entity/tx';

export const mockTx = (assetId: AssetId, txType: TxType, txFee: bigint) =>
  (({
    txType,
    proofData: Buffer.concat([
      numToUInt32BE(Math.max(0, txType - 3), 32),
      randomBytes(2 * 32),
      numToUInt32BE(assetId, 32),
      randomBytes((ProofData.NUM_PUBLIC_INPUTS - 5) * 32),
      toBufferBE(txFee, 32),
    ]),
  } as any) as TxDao);
