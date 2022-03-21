"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupProviderStatusFromJson = exports.rollupProviderStatusToJson = exports.runtimeConfigFromJson = exports.runtimeConfigToJson = exports.DefiSettlementTime = exports.TxSettlementTime = void 0;
const blockchain_1 = require("../blockchain");
const bridge_id_1 = require("../bridge_id");
var TxSettlementTime;
(function (TxSettlementTime) {
    TxSettlementTime[TxSettlementTime["NEXT_ROLLUP"] = 0] = "NEXT_ROLLUP";
    TxSettlementTime[TxSettlementTime["INSTANT"] = 1] = "INSTANT";
})(TxSettlementTime = exports.TxSettlementTime || (exports.TxSettlementTime = {}));
var DefiSettlementTime;
(function (DefiSettlementTime) {
    DefiSettlementTime[DefiSettlementTime["DEADLINE"] = 0] = "DEADLINE";
    DefiSettlementTime[DefiSettlementTime["NEXT_ROLLUP"] = 1] = "NEXT_ROLLUP";
    DefiSettlementTime[DefiSettlementTime["INSTANT"] = 2] = "INSTANT";
})(DefiSettlementTime = exports.DefiSettlementTime || (exports.DefiSettlementTime = {}));
function runtimeConfigToJson(runtimeConfig) {
    return {
        ...runtimeConfig,
        maxFeeGasPrice: runtimeConfig.maxFeeGasPrice.toString(),
        maxProviderGasPrice: runtimeConfig.maxProviderGasPrice.toString(),
    };
}
exports.runtimeConfigToJson = runtimeConfigToJson;
function runtimeConfigFromJson(runtimeConfig) {
    const { maxFeeGasPrice, maxProviderGasPrice } = runtimeConfig;
    return {
        ...runtimeConfig,
        ...(maxFeeGasPrice !== undefined ? { maxFeeGasPrice: BigInt(maxFeeGasPrice) } : {}),
        ...(maxProviderGasPrice !== undefined ? { maxProviderGasPrice: BigInt(maxProviderGasPrice) } : {}),
    };
}
exports.runtimeConfigFromJson = runtimeConfigFromJson;
function rollupProviderStatusToJson(status) {
    return {
        ...status,
        blockchainStatus: (0, blockchain_1.blockchainStatusToJson)(status.blockchainStatus),
        bridgeStatus: status.bridgeStatus.map(bridge_id_1.bridgeStatusToJson),
        runtimeConfig: runtimeConfigToJson(status.runtimeConfig),
    };
}
exports.rollupProviderStatusToJson = rollupProviderStatusToJson;
function rollupProviderStatusFromJson(status) {
    const { blockchainStatus, nextPublishTime, runtimeConfig, ...rest } = status;
    return {
        ...rest,
        blockchainStatus: (0, blockchain_1.blockchainStatusFromJson)(blockchainStatus),
        nextPublishTime: new Date(nextPublishTime),
        runtimeConfig: runtimeConfigFromJson(runtimeConfig),
    };
}
exports.rollupProviderStatusFromJson = rollupProviderStatusFromJson;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwX3Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvbGx1cF9wcm92aWRlci9yb2xsdXBfcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsOENBQW1HO0FBRW5HLDRDQUEwRTtBQUsxRSxJQUFZLGdCQUdYO0FBSEQsV0FBWSxnQkFBZ0I7SUFDMUIscUVBQVcsQ0FBQTtJQUNYLDZEQUFPLENBQUE7QUFDVCxDQUFDLEVBSFcsZ0JBQWdCLEdBQWhCLHdCQUFnQixLQUFoQix3QkFBZ0IsUUFHM0I7QUFFRCxJQUFZLGtCQUlYO0FBSkQsV0FBWSxrQkFBa0I7SUFDNUIsbUVBQVEsQ0FBQTtJQUNSLHlFQUFXLENBQUE7SUFDWCxpRUFBTyxDQUFBO0FBQ1QsQ0FBQyxFQUpXLGtCQUFrQixHQUFsQiwwQkFBa0IsS0FBbEIsMEJBQWtCLFFBSTdCO0FBdUJELFNBQWdCLG1CQUFtQixDQUFDLGFBQTRCO0lBQzlELE9BQU87UUFDTCxHQUFHLGFBQWE7UUFDaEIsY0FBYyxFQUFFLGFBQWEsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFO1FBQ3ZELG1CQUFtQixFQUFFLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUU7S0FDbEUsQ0FBQztBQUNKLENBQUM7QUFORCxrREFNQztBQUVELFNBQWdCLHFCQUFxQixDQUFDLGFBQWtCO0lBQ3RELE1BQU0sRUFBRSxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDOUQsT0FBTztRQUNMLEdBQUcsYUFBYTtRQUNoQixHQUFHLENBQUMsY0FBYyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNuRixHQUFHLENBQUMsbUJBQW1CLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztLQUNuRyxDQUFDO0FBQ0osQ0FBQztBQVBELHNEQU9DO0FBWUQsU0FBZ0IsMEJBQTBCLENBQUMsTUFBNEI7SUFDckUsT0FBTztRQUNMLEdBQUcsTUFBTTtRQUNULGdCQUFnQixFQUFFLElBQUEsbUNBQXNCLEVBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBQ2pFLFlBQVksRUFBRSxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyw4QkFBa0IsQ0FBQztRQUN6RCxhQUFhLEVBQUUsbUJBQW1CLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQztLQUN6RCxDQUFDO0FBQ0osQ0FBQztBQVBELGdFQU9DO0FBRUQsU0FBZ0IsNEJBQTRCLENBQUMsTUFBVztJQUN0RCxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxHQUFHLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQztJQUM3RSxPQUFPO1FBQ0wsR0FBRyxJQUFJO1FBQ1AsZ0JBQWdCLEVBQUUsSUFBQSxxQ0FBd0IsRUFBQyxnQkFBZ0IsQ0FBQztRQUM1RCxlQUFlLEVBQUUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDO1FBQzFDLGFBQWEsRUFBRSxxQkFBcUIsQ0FBQyxhQUFhLENBQUM7S0FDcEQsQ0FBQztBQUNKLENBQUM7QUFSRCxvRUFRQyJ9