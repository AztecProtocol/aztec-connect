import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ClientProofData } from '@aztec/barretenberg/client_proofs';
import { numToUInt32BE } from '@aztec/barretenberg/serialize';
import { randomBytes } from 'crypto';
import { TxDao } from '../entity/tx';

export const mockTx = (assetId: AssetId, txType: TxType, txFee: bigint) =>
  (({
    txType,
    proofData: Buffer.concat([
      numToUInt32BE(Math.max(0, txType - 3), 32),
      randomBytes(2 * 32),
      [TxType.DEFI_DEPOSIT, TxType.DEFI_CLAIM].includes(txType)
        ? new BridgeId(EthAddress.randomAddress(), 1, assetId, 0, 0).toBuffer()
        : numToUInt32BE(assetId, 32),
      randomBytes((ClientProofData.NUM_PUBLIC_INPUTS - 5) * 32),
      toBufferBE(txFee, 32),
    ]),
  } as any) as TxDao);
