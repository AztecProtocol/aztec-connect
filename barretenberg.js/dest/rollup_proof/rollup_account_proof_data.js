"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollupAccountProofData = void 0;
const client_proofs_1 = require("../client_proofs");
const inner_proof_1 = require("./inner_proof");
class RollupAccountProofData {
    constructor(proofData) {
        this.proofData = proofData;
        if (proofData.proofId !== client_proofs_1.ProofId.ACCOUNT) {
            throw new Error('Not an account proof.');
        }
    }
    get ENCODED_LENGTH() {
        return RollupAccountProofData.ENCODED_LENGTH;
    }
    static decode(encoded) {
        const proofId = encoded.readUInt8(0);
        if (proofId !== client_proofs_1.ProofId.ACCOUNT) {
            throw new Error('Not an account proof.');
        }
        let offset = 1;
        const noteCommitment1 = encoded.slice(offset, offset + 32);
        offset += 32;
        const noteCommitment2 = encoded.slice(offset, offset + 32);
        offset += 32;
        const nullifier1 = encoded.slice(offset, offset + 32);
        return new RollupAccountProofData(new inner_proof_1.InnerProofData(client_proofs_1.ProofId.ACCOUNT, noteCommitment1, noteCommitment2, nullifier1, Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32)));
    }
    encode() {
        const { noteCommitment1, noteCommitment2, nullifier1 } = this.proofData;
        return Buffer.concat([Buffer.from([client_proofs_1.ProofId.ACCOUNT]), noteCommitment1, noteCommitment2, nullifier1]);
    }
}
exports.RollupAccountProofData = RollupAccountProofData;
RollupAccountProofData.ENCODED_LENGTH = 1 + 3 * 32;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwX2FjY291bnRfcHJvb2ZfZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb2xsdXBfcHJvb2Yvcm9sbHVwX2FjY291bnRfcHJvb2ZfZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvREFBMkM7QUFDM0MsK0NBQStDO0FBRS9DLE1BQWEsc0JBQXNCO0lBR2pDLFlBQTRCLFNBQXlCO1FBQXpCLGNBQVMsR0FBVCxTQUFTLENBQWdCO1FBQ25ELElBQUksU0FBUyxDQUFDLE9BQU8sS0FBSyx1QkFBTyxDQUFDLE9BQU8sRUFBRTtZQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7U0FDMUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2hCLE9BQU8sc0JBQXNCLENBQUMsY0FBYyxDQUFDO0lBQy9DLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQWU7UUFDM0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxJQUFJLE9BQU8sS0FBSyx1QkFBTyxDQUFDLE9BQU8sRUFBRTtZQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7U0FDMUM7UUFFRCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDM0QsTUFBTSxJQUFJLEVBQUUsQ0FBQztRQUNiLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLElBQUksRUFBRSxDQUFDO1FBQ2IsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELE9BQU8sSUFBSSxzQkFBc0IsQ0FDL0IsSUFBSSw0QkFBYyxDQUNoQix1QkFBTyxDQUFDLE9BQU8sRUFDZixlQUFlLEVBQ2YsZUFBZSxFQUNmLFVBQVUsRUFDVixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUNqQixDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQsTUFBTTtRQUNKLE1BQU0sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDeEUsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLHVCQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDdkcsQ0FBQzs7QUExQ0gsd0RBMkNDO0FBMUNRLHFDQUFjLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMifQ==