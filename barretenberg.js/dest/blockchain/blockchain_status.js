"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainStatusFromJson = exports.blockchainStatusToJson = exports.isAccountCreation = exports.isDefiDeposit = exports.TxType = void 0;
const address_1 = require("../address");
var TxType;
(function (TxType) {
    TxType[TxType["DEPOSIT"] = 0] = "DEPOSIT";
    TxType[TxType["TRANSFER"] = 1] = "TRANSFER";
    TxType[TxType["WITHDRAW_TO_WALLET"] = 2] = "WITHDRAW_TO_WALLET";
    TxType[TxType["WITHDRAW_TO_CONTRACT"] = 3] = "WITHDRAW_TO_CONTRACT";
    TxType[TxType["ACCOUNT"] = 4] = "ACCOUNT";
    TxType[TxType["DEFI_DEPOSIT"] = 5] = "DEFI_DEPOSIT";
    TxType[TxType["DEFI_CLAIM"] = 6] = "DEFI_CLAIM";
})(TxType = exports.TxType || (exports.TxType = {}));
function isDefiDeposit(txType) {
    return txType === TxType.DEFI_DEPOSIT;
}
exports.isDefiDeposit = isDefiDeposit;
function isAccountCreation(txType) {
    return txType === TxType.ACCOUNT;
}
exports.isAccountCreation = isAccountCreation;
function blockchainStatusToJson(status) {
    return {
        ...status,
        rollupContractAddress: status.rollupContractAddress.toString(),
        feeDistributorContractAddress: status.feeDistributorContractAddress.toString(),
        verifierContractAddress: status.verifierContractAddress.toString(),
        dataRoot: status.dataRoot.toString('hex'),
        nullRoot: status.nullRoot.toString('hex'),
        rootRoot: status.rootRoot.toString('hex'),
        defiRoot: status.defiRoot.toString('hex'),
        defiInteractionHashes: status.defiInteractionHashes.map(v => v.toString('hex')),
        assets: status.assets.map(a => ({
            ...a,
            address: a.address.toString(),
        })),
        bridges: status.bridges.map(b => ({
            ...b,
            address: b.address.toString(),
            gasLimit: b.gasLimit.toString(),
        })),
    };
}
exports.blockchainStatusToJson = blockchainStatusToJson;
function blockchainStatusFromJson(json) {
    return {
        ...json,
        rollupContractAddress: address_1.EthAddress.fromString(json.rollupContractAddress),
        feeDistributorContractAddress: address_1.EthAddress.fromString(json.feeDistributorContractAddress),
        verifierContractAddress: address_1.EthAddress.fromString(json.feeDistributorContractAddress),
        dataRoot: Buffer.from(json.dataRoot, 'hex'),
        nullRoot: Buffer.from(json.nullRoot, 'hex'),
        rootRoot: Buffer.from(json.rootRoot, 'hex'),
        defiRoot: Buffer.from(json.defiRoot, 'hex'),
        defiInteractionHashes: json.defiInteractionHashes.map(f => Buffer.from(f, 'hex')),
        assets: json.assets.map(a => ({
            ...a,
            address: address_1.EthAddress.fromString(a.address),
        })),
        bridges: json.bridges.map(b => ({
            ...b,
            address: address_1.EthAddress.fromString(b.address),
            gasLimit: BigInt(b.gasLimit),
        })),
    };
}
exports.blockchainStatusFromJson = blockchainStatusFromJson;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxvY2tjaGFpbl9zdGF0dXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYmxvY2tjaGFpbi9ibG9ja2NoYWluX3N0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3Q0FBd0M7QUFFeEMsSUFBWSxNQVFYO0FBUkQsV0FBWSxNQUFNO0lBQ2hCLHlDQUFPLENBQUE7SUFDUCwyQ0FBUSxDQUFBO0lBQ1IsK0RBQWtCLENBQUE7SUFDbEIsbUVBQW9CLENBQUE7SUFDcEIseUNBQU8sQ0FBQTtJQUNQLG1EQUFZLENBQUE7SUFDWiwrQ0FBVSxDQUFBO0FBQ1osQ0FBQyxFQVJXLE1BQU0sR0FBTixjQUFNLEtBQU4sY0FBTSxRQVFqQjtBQUVELFNBQWdCLGFBQWEsQ0FBQyxNQUFjO0lBQzFDLE9BQU8sTUFBTSxLQUFLLE1BQU0sQ0FBQyxZQUFZLENBQUM7QUFDeEMsQ0FBQztBQUZELHNDQUVDO0FBRUQsU0FBZ0IsaUJBQWlCLENBQUMsTUFBYztJQUM5QyxPQUFPLE1BQU0sS0FBSyxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ25DLENBQUM7QUFGRCw4Q0FFQztBQW9FRCxTQUFnQixzQkFBc0IsQ0FBQyxNQUF3QjtJQUM3RCxPQUFPO1FBQ0wsR0FBRyxNQUFNO1FBQ1QscUJBQXFCLEVBQUUsTUFBTSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsRUFBRTtRQUM5RCw2QkFBNkIsRUFBRSxNQUFNLENBQUMsNkJBQTZCLENBQUMsUUFBUSxFQUFFO1FBQzlFLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUU7UUFDbEUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztRQUN6QyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1FBQ3pDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7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