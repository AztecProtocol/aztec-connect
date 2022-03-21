"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollupSendProofData = void 0;
const client_proofs_1 = require("../client_proofs");
const inner_proof_1 = require("./inner_proof");
class RollupSendProofData {
    constructor(proofData) {
        this.proofData = proofData;
        if (proofData.proofId !== client_proofs_1.ProofId.SEND) {
            throw new Error('Not a send proof.');
        }
    }
    get ENCODED_LENGTH() {
        return RollupSendProofData.ENCODED_LENGTH;
    }
    static decode(encoded) {
        const proofId = encoded.readUInt8(0);
        if (proofId !== client_proofs_1.ProofId.SEND) {
            throw new Error('Not a send proof.');
        }
        let offset = 1;
        const noteCommitment1 = encoded.slice(offset, offset + 32);
        offset += 32;
        const noteCommitment2 = encoded.slice(offset, offset + 32);
        offset += 32;
        const nullifier1 = encoded.slice(offset, offset + 32);
        offset += 32;
        const nullifier2 = encoded.slice(offset, offset + 32);
        return new RollupSendProofData(new inner_proof_1.InnerProofData(client_proofs_1.ProofId.SEND, noteCommitment1, noteCommitment2, nullifier1, nullifier2, Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32)));
    }
    encode() {
        const { noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = this.proofData;
        return Buffer.concat([Buffer.from([client_proofs_1.ProofId.SEND]), noteCommitment1, noteCommitment2, nullifier1, nullifier2]);
    }
}
exports.RollupSendProofData = RollupSendProofData;
RollupSendProofData.ENCODED_LENGTH = 1 + 4 * 32;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwX3NlbmRfcHJvb2ZfZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb2xsdXBfcHJvb2Yvcm9sbHVwX3NlbmRfcHJvb2ZfZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvREFBMkM7QUFDM0MsK0NBQStDO0FBRS9DLE1BQWEsbUJBQW1CO0lBRzlCLFlBQTRCLFNBQXlCO1FBQXpCLGNBQVMsR0FBVCxTQUFTLENBQWdCO1FBQ25ELElBQUksU0FBUyxDQUFDLE9BQU8sS0FBSyx1QkFBTyxDQUFDLElBQUksRUFBRTtZQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7U0FDdEM7SUFDSCxDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2hCLE9BQU8sbUJBQW1CLENBQUMsY0FBYyxDQUFDO0lBQzVDLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQWU7UUFDM0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxJQUFJLE9BQU8sS0FBSyx1QkFBTyxDQUFDLElBQUksRUFBRTtZQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7U0FDdEM7UUFFRCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDM0QsTUFBTSxJQUFJLEVBQUUsQ0FBQztRQUNiLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLElBQUksRUFBRSxDQUFDO1FBQ2IsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDYixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDdEQsT0FBTyxJQUFJLG1CQUFtQixDQUM1QixJQUFJLDRCQUFjLENBQ2hCLHVCQUFPLENBQUMsSUFBSSxFQUNaLGVBQWUsRUFDZixlQUFlLEVBQ2YsVUFBVSxFQUNWLFVBQVUsRUFDVixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUNqQixDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQsTUFBTTtRQUNKLE1BQU0sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ3BGLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyx1QkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUNoSCxDQUFDOztBQTVDSCxrREE2Q0M7QUE1Q1Esa0NBQWMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyJ9