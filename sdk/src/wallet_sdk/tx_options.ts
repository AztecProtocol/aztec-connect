import { PermitArgs } from 'blockchain';
import { EthereumSigner } from '../signer';

export interface JoinSplitTxOptions {
  txFee?: bigint;
  payTxFeeByPrivateAsset?: boolean;
  feePayer?: EthereumSigner;
  permitArgs?: PermitArgs;
}
