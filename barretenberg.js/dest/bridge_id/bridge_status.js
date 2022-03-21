"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToBridgeStatus = exports.bridgeStatusToJson = void 0;
function bridgeStatusToJson(status) {
    return {
        ...status,
        bridgeId: status.bridgeId.toString(),
    };
}
exports.bridgeStatusToJson = bridgeStatusToJson;
function convertToBridgeStatus(bridgeConfig, rollupNumber, publishTime, gasAccrued, gasThreshold) {
    return {
        bridgeId: bridgeConfig.bridgeId,
        numTxs: bridgeConfig.numTxs,
        gasThreshold: gasThreshold.toString(),
        gasAccrued: gasAccrued.toString(),
        rollupFrequency: bridgeConfig.rollupFrequency,
        nextRollupNumber: rollupNumber,
        nextPublishTime: publishTime,
    };
}
exports.convertToBridgeStatus = convertToBridgeStatus;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJpZGdlX3N0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9icmlkZ2VfaWQvYnJpZGdlX3N0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFZQSxTQUFnQixrQkFBa0IsQ0FBQyxNQUFvQjtJQUNyRCxPQUFPO1FBQ0wsR0FBRyxNQUFNO1FBQ1QsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO0tBQ3JDLENBQUM7QUFDSixDQUFDO0FBTEQsZ0RBS0M7QUFFRCxTQUFnQixxQkFBcUIsQ0FDbkMsWUFBMEIsRUFDMUIsWUFBZ0MsRUFDaEMsV0FBNkIsRUFDN0IsVUFBa0IsRUFDbEIsWUFBb0I7SUFFcEIsT0FBTztRQUNMLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUTtRQUMvQixNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU07UUFDM0IsWUFBWSxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUU7UUFDckMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUU7UUFDakMsZUFBZSxFQUFFLFlBQVksQ0FBQyxlQUFlO1FBQzdDLGdCQUFnQixFQUFFLFlBQVk7UUFDOUIsZUFBZSxFQUFFLFdBQVc7S0FDYixDQUFDO0FBQ3BCLENBQUM7QUFoQkQsc0RBZ0JDIn0=