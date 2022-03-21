"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollupDefiDepositProofData = void 0;
const bigint_buffer_1 = require("../bigint_buffer");
const bridge_id_1 = require("../bridge_id");
const client_proofs_1 = require("../client_proofs");
const inner_proof_1 = require("./inner_proof");
class RollupDefiDepositProofData {
    constructor(proofData) {
        this.proofData = proofData;
        if (proofData.proofId !== client_proofs_1.ProofId.DEFI_DEPOSIT) {
            throw new Error('Not a defi deposit proof.');
        }
    }
    get ENCODED_LENGTH() {
        return RollupDefiDepositProofData.ENCODED_LENGTH;
    }
    get bridgeId() {
        return bridge_id_1.BridgeId.fromBuffer(this.proofData.assetId);
    }
    get deposit() {
        return (0, bigint_buffer_1.toBigIntBE)(this.proofData.publicValue);
    }
    static decode(encoded) {
        const proofId = encoded.readUInt8(0);
        if (proofId !== client_proofs_1.ProofId.DEFI_DEPOSIT) {
            throw new Error('Not a defi deposit proof.');
        }
        let offset = 1;
        const noteCommitment1 = encoded.slice(offset, offset + 32);
        offset += 32;
        const noteCommitment2 = encoded.slice(offset, offset + 32);
        offset += 32;
        const nullifier1 = encoded.slice(offset, offset + 32);
        offset += 32;
        const nullifier2 = encoded.slice(offset, offset + 32);
        return new RollupDefiDepositProofData(new inner_proof_1.InnerProofData(client_proofs_1.ProofId.DEFI_DEPOSIT, noteCommitment1, noteCommitment2, nullifier1, nullifier2, Buffer.alloc(32), Buffer.alloc(32), Buffer.alloc(32)));
    }
    encode() {
        const { noteCommitment1, noteCommitment2, nullifier1, nullifier2 } = this.proofData;
        return Buffer.concat([
            Buffer.from([client_proofs_1.ProofId.DEFI_DEPOSIT]),
            noteCommitment1,
            noteCommitment2,
            nullifier1,
            nullifier2,
        ]);
    }
}
exports.RollupDefiDepositProofData = RollupDefiDepositProofData;
RollupDefiDepositProofData.ENCODED_LENGTH = 1 + 4 * 32;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwX2RlZmlfZGVwb3NpdF9wcm9vZl9kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvbGx1cF9wcm9vZi9yb2xsdXBfZGVmaV9kZXBvc2l0X3Byb29mX2RhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsb0RBQThDO0FBQzlDLDRDQUF3QztBQUN4QyxvREFBMkM7QUFDM0MsK0NBQStDO0FBRS9DLE1BQWEsMEJBQTBCO0lBR3JDLFlBQTRCLFNBQXlCO1FBQXpCLGNBQVMsR0FBVCxTQUFTLENBQWdCO1FBQ25ELElBQUksU0FBUyxDQUFDLE9BQU8sS0FBSyx1QkFBTyxDQUFDLFlBQVksRUFBRTtZQUM5QyxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7U0FDOUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2hCLE9BQU8sMEJBQTBCLENBQUMsY0FBYyxDQUFDO0lBQ25ELENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDVixPQUFPLG9CQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVELElBQUksT0FBTztRQUNULE9BQU8sSUFBQSwwQkFBVSxFQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBZTtRQUMzQixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLElBQUksT0FBTyxLQUFLLHVCQUFPLENBQUMsWUFBWSxFQUFFO1lBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztTQUM5QztRQUVELElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNmLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLElBQUksRUFBRSxDQUFDO1FBQ2IsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDYixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDdEQsTUFBTSxJQUFJLEVBQUUsQ0FBQztRQUNiLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN0RCxPQUFPLElBQUksMEJBQTBCLENBQ25DLElBQUksNEJBQWMsQ0FDaEIsdUJBQU8sQ0FBQyxZQUFZLEVBQ3BCLGVBQWUsRUFDZixlQUFlLEVBQ2YsVUFBVSxFQUNWLFVBQVUsRUFDVixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUNqQixDQUNGLENBQUM7SUFDSixDQUFDO0lBRUQsTUFBTTtRQUNKLE1BQU0sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ3BGLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNuQixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsdUJBQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNuQyxlQUFlO1lBQ2YsZUFBZTtZQUNmLFVBQVU7WUFDVixVQUFVO1NBQ1gsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7QUExREgsZ0VBMkRDO0FBMURRLHlDQUFjLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMifQ==