"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollupPaddingProofData = void 0;
const client_proofs_1 = require("../client_proofs");
const inner_proof_1 = require("./inner_proof");
class RollupPaddingProofData {
    constructor(proofData) {
        this.proofData = proofData;
        if (proofData.proofId !== client_proofs_1.ProofId.PADDING) {
            throw new Error('Not a padding proof.');
        }
    }
    get ENCODED_LENGTH() {
        return RollupPaddingProofData.ENCODED_LENGTH;
    }
    static decode(encoded) {
        const proofId = encoded.readUInt8(0);
        if (proofId !== client_proofs_1.ProofId.PADDING) {
            throw new Error('Not a padding proof.');
        }
        return new RollupPaddingProofData(new inner_proof_1.InnerProofData(client_proofs_1.ProofId.PADDING, Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32)));
    }
    encode() {
        return Buffer.from([client_proofs_1.ProofId.PADDING]);
    }
}
exports.RollupPaddingProofData = RollupPaddingProofData;
RollupPaddingProofData.ENCODED_LENGTH = 1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwX3BhZGRpbmdfcHJvb2ZfZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb2xsdXBfcHJvb2Yvcm9sbHVwX3BhZGRpbmdfcHJvb2ZfZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvREFBMkM7QUFDM0MsK0NBQStDO0FBRS9DLE1BQWEsc0JBQXNCO0lBR2pDLFlBQTRCLFNBQXlCO1FBQXpCLGNBQVMsR0FBVCxTQUFTLENBQWdCO1FBQ25ELElBQUksU0FBUyxDQUFDLE9BQU8sS0FBSyx1QkFBTyxDQUFDLE9BQU8sRUFBRTtZQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDekM7SUFDSCxDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2hCLE9BQU8sc0JBQXNCLENBQUMsY0FBYyxDQUFDO0lBQy9DLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQWU7UUFDM0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxJQUFJLE9BQU8sS0FBSyx1QkFBTyxDQUFDLE9BQU8sRUFBRTtZQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7U0FDekM7UUFDRCxPQUFPLElBQUksc0JBQXNCLENBQy9CLElBQUksNEJBQWMsQ0FDaEIsdUJBQU8sQ0FBQyxPQUFPLEVBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FDakIsQ0FDRixDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU07UUFDSixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyx1QkFBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDeEMsQ0FBQzs7QUFsQ0gsd0RBbUNDO0FBbENRLHFDQUFjLEdBQUcsQ0FBQyxDQUFDIn0=