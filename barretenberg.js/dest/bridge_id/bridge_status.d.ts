import { BridgeConfig } from './bridge_config';
export interface BridgeStatus {
    bridgeId: bigint;
    numTxs: number;
    gasThreshold: string;
    gasAccrued: string;
    rollupFrequency: number;
    nextRollupNumber?: number;
    nextPublishTime?: Date;
}
export declare function bridgeStatusToJson(status: BridgeStatus): {
    bridgeId: string;
    numTxs: number;
    gasThreshold: string;
    gasAccrued: string;
    rollupFrequency: number;
    nextRollupNumber?: number | undefined;
    nextPublishTime?: Date | undefined;
};
export declare function convertToBridgeStatus(bridgeConfig: BridgeConfig, rollupNumber: number | undefined, publishTime: Date | undefined, gasAccrued: bigint, gasThreshold: bigint): BridgeStatus;
//# sourceMappingURL=bridge_status.d.ts.map