"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollupDefiClaimProofData = void 0;
const bridge_id_1 = require("../bridge_id");
const client_proofs_1 = require("../client_proofs");
const inner_proof_1 = require("./inner_proof");
class RollupDefiClaimProofData {
    constructor(proofData) {
        this.proofData = proofData;
        if (proofData.proofId !== client_proofs_1.ProofId.DEFI_CLAIM) {
            throw new Error('Not a defi claim proof.');
        }
    }
    get ENCODED_LENGTH() {
        return RollupDefiClaimProofData.ENCODED_LENGTH;
    }
    get bridgeId() {
        return bridge_id_1.BridgeId.fromBuffer(this.proofData.assetId);
    }
    static decode(encoded) {
        const proofId = encoded.readUInt8(0);
        if (proofId !== client_proofs_1.ProofId.DEFI_CLAIM) {
            throw new Error('Not a defi claim proof.');
        }
        let offset = 1;
        const noteCommitment1 = encoded.slice(offset, offset + 32);
        offset += 32;
        const noteCommitment2 = encoded.slice(offset, offset + 32);
        offset += 32;
        const nullifier1 = encoded.slice(offset, offset + 32);
        offset += 32;
        const nullifier2 = encoded.slice(offset, offset + 32);
        return new RollupDefiClaimProofData(new inner_proof_1.InnerProofData(client_proofs_1.ProofId.DEFI_CLAIM, noteCommitment1, noteCommitment2, nullifier1, nullifier2, Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32)));
    }
    encode() {
        const { noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = this.proofData;
        return Buffer.concat([Buffer.from([client_proofs_1.ProofId.DEFI_CLAIM]), noteCommitment1, noteCommitment2, nullifier1, nullifier2]);
    }
}
exports.RollupDefiClaimProofData = RollupDefiClaimProofData;
RollupDefiClaimProofData.ENCODED_LENGTH = 1 + 4 * 32;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwX2RlZmlfY2xhaW1fcHJvb2ZfZGF0YS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb2xsdXBfcHJvb2Yvcm9sbHVwX2RlZmlfY2xhaW1fcHJvb2ZfZGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0Q0FBd0M7QUFDeEMsb0RBQTJDO0FBQzNDLCtDQUErQztBQUUvQyxNQUFhLHdCQUF3QjtJQUduQyxZQUE0QixTQUF5QjtRQUF6QixjQUFTLEdBQVQsU0FBUyxDQUFnQjtRQUNuRCxJQUFJLFNBQVMsQ0FBQyxPQUFPLEtBQUssdUJBQU8sQ0FBQyxVQUFVLEVBQUU7WUFDNUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1NBQzVDO0lBQ0gsQ0FBQztJQUVELElBQUksY0FBYztRQUNoQixPQUFPLHdCQUF3QixDQUFDLGNBQWMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1YsT0FBTyxvQkFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQWU7UUFDM0IsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxJQUFJLE9BQU8sS0FBSyx1QkFBTyxDQUFDLFVBQVUsRUFBRTtZQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7U0FDNUM7UUFFRCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDM0QsTUFBTSxJQUFJLEVBQUUsQ0FBQztRQUNiLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLElBQUksRUFBRSxDQUFDO1FBQ2IsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDYixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDdEQsT0FBTyxJQUFJLHdCQUF3QixDQUNqQyxJQUFJLDRCQUFjLENBQ2hCLHVCQUFPLENBQUMsVUFBVSxFQUNsQixlQUFlLEVBQ2YsZUFBZSxFQUNmLFVBQVUsRUFDVixVQUFVLEVBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFDaEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FDakIsQ0FDRixDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU07UUFDSixNQUFNLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNwRixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsdUJBQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDdEgsQ0FBQzs7QUFoREgsNERBaURDO0FBaERRLHVDQUFjLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMifQ==