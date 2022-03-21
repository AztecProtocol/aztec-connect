"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinSplitProofData = void 0;
const address_1 = require("../../address");
const bigint_buffer_1 = require("../../bigint_buffer");
const proof_data_1 = require("./proof_data");
class JoinSplitProofData {
    constructor(proofData) {
        this.proofData = proofData;
    }
    static fromBuffer(rawProofData) {
        return new JoinSplitProofData(new proof_data_1.ProofData(rawProofData));
    }
    get txId() {
        return this.proofData.txId;
    }
    get publicAssetId() {
        return this.proofData.publicAssetId.readUInt32BE(28);
    }
    get publicValue() {
        return (0, bigint_buffer_1.toBigIntBE)(this.proofData.publicValue);
    }
    get publicOwner() {
        return new address_1.EthAddress(this.proofData.publicOwner);
    }
    get txFee() {
        return (0, bigint_buffer_1.toBigIntBE)(this.proofData.txFee);
    }
    get txFeeAssetId() {
        return this.proofData.txFeeAssetId.readUInt32BE(28);
    }
}
exports.JoinSplitProofData = JoinSplitProofData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiam9pbl9zcGxpdF9wcm9vZl9kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudF9wcm9vZnMvcHJvb2ZfZGF0YS9qb2luX3NwbGl0X3Byb29mX2RhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMkNBQTJDO0FBQzNDLHVEQUFpRDtBQUNqRCw2Q0FBeUM7QUFFekMsTUFBYSxrQkFBa0I7SUFDN0IsWUFBNEIsU0FBb0I7UUFBcEIsY0FBUyxHQUFULFNBQVMsQ0FBVztJQUFHLENBQUM7SUFFcEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFvQjtRQUNwQyxPQUFPLElBQUksa0JBQWtCLENBQUMsSUFBSSxzQkFBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELElBQUksSUFBSTtRQUNOLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7SUFDN0IsQ0FBQztJQUVELElBQUksYUFBYTtRQUNmLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDYixPQUFPLElBQUEsMEJBQVUsRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDYixPQUFPLElBQUksb0JBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUCxPQUFPLElBQUEsMEJBQVUsRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN0RCxDQUFDO0NBQ0Y7QUE5QkQsZ0RBOEJDIn0=