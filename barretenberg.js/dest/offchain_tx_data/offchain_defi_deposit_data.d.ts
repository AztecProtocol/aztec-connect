/// <reference types="node" />
import { GrumpkinAddress } from '../address';
import { BridgeId } from '../bridge_id';
import { ViewingKey } from '../viewing_key';
export declare class OffchainDefiDepositData {
    readonly bridgeId: BridgeId;
    readonly partialState: Buffer;
    readonly partialStateSecretEphPubKey: GrumpkinAddress;
    readonly depositValue: bigint;
    readonly txFee: bigint;
    readonly viewingKey: ViewingKey;
    readonly txRefNo: number;
    static EMPTY: OffchainDefiDepositData;
    static SIZE: number;
    constructor(bridgeId: BridgeId, partialState: Buffer, partialStateSecretEphPubKey: GrumpkinAddress, // the public key from which the partial state's secret may be derived (when combined with a valid account private key).
    depositValue: bigint, txFee: bigint, viewingKey: ViewingKey, // viewing key for the 'change' note
    txRefNo?: number);
    static fromBuffer(buf: Buffer): OffchainDefiDepositData;
    toBuffer(): Buffer;
}
//# sourceMappingURL=offchain_defi_deposit_data.d.ts.map