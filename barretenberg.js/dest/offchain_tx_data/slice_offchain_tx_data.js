"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sliceOffchainTxData = void 0;
const client_proofs_1 = require("../client_proofs");
const offchain_account_data_1 = require("./offchain_account_data");
const offchain_defi_deposit_data_1 = require("./offchain_defi_deposit_data");
const offchain_join_split_data_1 = require("./offchain_join_split_data");
const sliceOffchainTxData = (proofIds, offchainTxData) => {
    let dataStart = 0;
    let dataEnd = 0;
    return proofIds.map(proofId => {
        dataStart = dataEnd;
        switch (proofId) {
            case client_proofs_1.ProofId.DEPOSIT:
            case client_proofs_1.ProofId.WITHDRAW:
            case client_proofs_1.ProofId.SEND:
                dataEnd += offchain_join_split_data_1.OffchainJoinSplitData.SIZE;
                return offchainTxData.slice(dataStart, dataEnd);
            case client_proofs_1.ProofId.ACCOUNT:
                dataEnd += offchain_account_data_1.OffchainAccountData.SIZE;
                return offchainTxData.slice(dataStart, dataEnd);
            case client_proofs_1.ProofId.DEFI_DEPOSIT:
                dataEnd += offchain_defi_deposit_data_1.OffchainDefiDepositData.SIZE;
                return offchainTxData.slice(dataStart, dataEnd);
            default:
                return Buffer.alloc(0);
        }
    });
};
exports.sliceOffchainTxData = sliceOffchainTxData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2xpY2Vfb2ZmY2hhaW5fdHhfZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9vZmZjaGFpbl90eF9kYXRhL3NsaWNlX29mZmNoYWluX3R4X2RhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0RBQTJDO0FBQzNDLG1FQUE4RDtBQUM5RCw2RUFBdUU7QUFDdkUseUVBQW1FO0FBRTVELE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxRQUFtQixFQUFFLGNBQXNCLEVBQUUsRUFBRTtJQUNqRixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFDbEIsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBQ2hCLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM1QixTQUFTLEdBQUcsT0FBTyxDQUFDO1FBQ3BCLFFBQVEsT0FBTyxFQUFFO1lBQ2YsS0FBSyx1QkFBTyxDQUFDLE9BQU8sQ0FBQztZQUNyQixLQUFLLHVCQUFPLENBQUMsUUFBUSxDQUFDO1lBQ3RCLEtBQUssdUJBQU8sQ0FBQyxJQUFJO2dCQUNmLE9BQU8sSUFBSSxnREFBcUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3RDLE9BQU8sY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEQsS0FBSyx1QkFBTyxDQUFDLE9BQU87Z0JBQ2xCLE9BQU8sSUFBSSwyQ0FBbUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3BDLE9BQU8sY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEQsS0FBSyx1QkFBTyxDQUFDLFlBQVk7Z0JBQ3ZCLE9BQU8sSUFBSSxvREFBdUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3hDLE9BQU8sY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbEQ7Z0JBQ0UsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFCO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFyQlcsUUFBQSxtQkFBbUIsdUJBcUI5QiJ9