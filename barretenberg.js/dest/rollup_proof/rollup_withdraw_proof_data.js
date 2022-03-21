"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollupWithdrawProofData = void 0;
const address_1 = require("../address");
const bigint_buffer_1 = require("../bigint_buffer");
const client_proofs_1 = require("../client_proofs");
const inner_proof_1 = require("./inner_proof");
class RollupWithdrawProofData {
    constructor(proofData) {
        this.proofData = proofData;
        if (proofData.proofId !== client_proofs_1.ProofId.WITHDRAW) {
            throw new Error('Not a withdraw proof.');
        }
    }
    get ENCODED_LENGTH() {
        return RollupWithdrawProofData.ENCODED_LENGTH;
    }
    get assetId() {
        return this.proofData.assetId.readUInt32BE(28);
    }
    get publicValue() {
        return (0, bigint_buffer_1.toBigIntBE)(this.proofData.publicValue);
    }
    get publicOwner() {
        return new address_1.EthAddress(this.proofData.publicOwner);
    }
    static decode(encoded) {
        const proofId = encoded.readUInt8(0);
        if (proofId !== client_proofs_1.ProofId.WITHDRAW) {
            throw new Error('Not a withdraw proof.');
        }
        let offset = 1;
        const noteCommitment1 = encoded.slice(offset, offset + 32);
        offset += 32;
        const noteCommitment2 = encoded.slice(offset, offset + 32);
        offset += 32;
        const nullifier1 = encoded.slice(offset, offset + 32);
        offset += 32;
        const nullifier2 = encoded.slice(offset, offset + 32);
        offset += 32;
        const publicValue = encoded.slice(offset, offset + 32);
        offset += 32;
        const publicOwner = Buffer.concat([Buffer.alloc(12), encoded.slice(offset, offset + 20)]);
        offset += 20;
        const assetId = Buffer.concat([Buffer.alloc(28), encoded.slice(offset, offset + 4)]);
        return new RollupWithdrawProofData(new inner_proof_1.InnerProofData(client_proofs_1.ProofId.WITHDRAW, noteCommitment1, noteCommitment2, nullifier1, nullifier2, publicValue, publicOwner, assetId));
    }
    encode() {
        const { noteCommitment1, noteCommitment2, nullifier1, nullifier2, publicValue, assetId } = this.proofData;
        const encodedAssetId = assetId.slice(28, 32);
        return Buffer.concat([
            Buffer.from([client_proofs_1.ProofId.WITHDRAW]),
            noteCommitment1,
            noteCommitment2,
            nullifier1,
            nullifier2,
            publicValue,
            this.publicOwner.toBuffer(),
            encodedAssetId,
        ]);
    }
}
exports.RollupWithdrawProofData = RollupWithdrawProofData;
RollupWithdrawProofData.ENCODED_LENGTH = 1 + 5 * 32 + 20 + 4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbHVwX3dpdGhkcmF3X3Byb29mX2RhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm9sbHVwX3Byb29mL3JvbGx1cF93aXRoZHJhd19wcm9vZl9kYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdDQUF3QztBQUN4QyxvREFBOEM7QUFDOUMsb0RBQTJDO0FBQzNDLCtDQUErQztBQUUvQyxNQUFhLHVCQUF1QjtJQUdsQyxZQUE0QixTQUF5QjtRQUF6QixjQUFTLEdBQVQsU0FBUyxDQUFnQjtRQUNuRCxJQUFJLFNBQVMsQ0FBQyxPQUFPLEtBQUssdUJBQU8sQ0FBQyxRQUFRLEVBQUU7WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1NBQzFDO0lBQ0gsQ0FBQztJQUVELElBQUksY0FBYztRQUNoQixPQUFPLHVCQUF1QixDQUFDLGNBQWMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELElBQUksV0FBVztRQUNiLE9BQU8sSUFBQSwwQkFBVSxFQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELElBQUksV0FBVztRQUNiLE9BQU8sSUFBSSxvQkFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBZTtRQUMzQixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLElBQUksT0FBTyxLQUFLLHVCQUFPLENBQUMsUUFBUSxFQUFFO1lBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztTQUMxQztRQUVELElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNmLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLElBQUksRUFBRSxDQUFDO1FBQ2IsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDYixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDdEQsTUFBTSxJQUFJLEVBQUUsQ0FBQztRQUNiLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN0RCxNQUFNLElBQUksRUFBRSxDQUFDO1FBQ2IsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDYixNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFGLE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDYixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JGLE9BQU8sSUFBSSx1QkFBdUIsQ0FDaEMsSUFBSSw0QkFBYyxDQUNoQix1QkFBTyxDQUFDLFFBQVEsRUFDaEIsZUFBZSxFQUNmLGVBQWUsRUFDZixVQUFVLEVBQ1YsVUFBVSxFQUNWLFdBQVcsRUFDWCxXQUFXLEVBQ1gsT0FBTyxDQUNSLENBQ0YsQ0FBQztJQUNKLENBQUM7SUFFRCxNQUFNO1FBQ0osTUFBTSxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUMxRyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM3QyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLHVCQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDL0IsZUFBZTtZQUNmLGVBQWU7WUFDZixVQUFVO1lBQ1YsVUFBVTtZQUNWLFdBQVc7WUFDWCxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTtZQUMzQixjQUFjO1NBQ2YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7QUF4RUgsMERBeUVDO0FBeEVRLHNDQUFjLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyJ9