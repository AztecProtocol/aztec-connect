"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefiDepositProofData = void 0;
const bigint_buffer_1 = require("../../bigint_buffer");
const bridge_id_1 = require("../../bridge_id");
const proof_data_1 = require("./proof_data");
const proof_id_1 = require("./proof_id");
class DefiDepositProofData {
    constructor(proofData) {
        this.proofData = proofData;
        if (proofData.proofId !== proof_id_1.ProofId.DEFI_DEPOSIT) {
            throw new Error('Not a defi deposit proof.');
        }
    }
    static fromBuffer(rawProofData) {
        return new DefiDepositProofData(new proof_data_1.ProofData(rawProofData));
    }
    get txFee() {
        return (0, bigint_buffer_1.toBigIntBE)(this.proofData.txFee);
    }
    get txFeeAssetId() {
        return this.proofData.txFeeAssetId.readUInt32BE(28);
    }
    get bridgeId() {
        return bridge_id_1.BridgeId.fromBuffer(this.proofData.bridgeId);
    }
    get defiDepositValue() {
        return (0, bigint_buffer_1.toBigIntBE)(this.proofData.defiDepositValue);
    }
}
exports.DefiDepositProofData = DefiDepositProofData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaV9kZXBvc2l0X3Byb29mX2RhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpZW50X3Byb29mcy9wcm9vZl9kYXRhL2RlZmlfZGVwb3NpdF9wcm9vZl9kYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHVEQUFpRDtBQUNqRCwrQ0FBMkM7QUFDM0MsNkNBQXlDO0FBQ3pDLHlDQUFxQztBQUVyQyxNQUFhLG9CQUFvQjtJQUMvQixZQUE0QixTQUFvQjtRQUFwQixjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQzlDLElBQUksU0FBUyxDQUFDLE9BQU8sS0FBSyxrQkFBTyxDQUFDLFlBQVksRUFBRTtZQUM5QyxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7U0FDOUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFvQjtRQUNwQyxPQUFPLElBQUksb0JBQW9CLENBQUMsSUFBSSxzQkFBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVELElBQUksS0FBSztRQUNQLE9BQU8sSUFBQSwwQkFBVSxFQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELElBQUksWUFBWTtRQUNkLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDVixPQUFPLG9CQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ2xCLE9BQU8sSUFBQSwwQkFBVSxFQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQ0Y7QUExQkQsb0RBMEJDIn0=