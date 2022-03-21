"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InnerProofData = void 0;
const client_proofs_1 = require("../client_proofs");
const serialize_1 = require("../serialize");
class InnerProofData {
    constructor(proofId, noteCommitment1, noteCommitment2, nullifier1, nullifier2, publicValue, publicOwner, assetId) {
        this.proofId = proofId;
        this.noteCommitment1 = noteCommitment1;
        this.noteCommitment2 = noteCommitment2;
        this.nullifier1 = nullifier1;
        this.nullifier2 = nullifier2;
        this.publicValue = publicValue;
        this.publicOwner = publicOwner;
        this.assetId = assetId;
        this.txId = (0, client_proofs_1.createTxId)(this.toBuffer());
    }
    getDepositSigningData() {
        return this.toBuffer();
    }
    toBuffer() {
        return Buffer.concat([
            (0, serialize_1.numToUInt32BE)(this.proofId, 32),
            this.noteCommitment1,
            this.noteCommitment2,
            this.nullifier1,
            this.nullifier2,
            this.publicValue,
            this.publicOwner,
            this.assetId,
        ]);
    }
    isPadding() {
        return this.proofId === client_proofs_1.ProofId.PADDING;
    }
    static fromBuffer(innerPublicInputs) {
        let dataStart = 0;
        const proofId = innerPublicInputs.readUInt32BE(dataStart + 28);
        dataStart += 32;
        const noteCommitment1 = innerPublicInputs.slice(dataStart, dataStart + 32);
        dataStart += 32;
        const noteCommitment2 = innerPublicInputs.slice(dataStart, dataStart + 32);
        dataStart += 32;
        const nullifier1 = innerPublicInputs.slice(dataStart, dataStart + 32);
        dataStart += 32;
        const nullifier2 = innerPublicInputs.slice(dataStart, dataStart + 32);
        dataStart += 32;
        const publicValue = innerPublicInputs.slice(dataStart, dataStart + 32);
        dataStart += 32;
        const publicOwner = innerPublicInputs.slice(dataStart, dataStart + 32);
        dataStart += 32;
        const assetId = innerPublicInputs.slice(dataStart, dataStart + 32);
        dataStart += 32;
        return new InnerProofData(proofId, noteCommitment1, noteCommitment2, nullifier1, nullifier2, publicValue, publicOwner, assetId);
    }
}
exports.InnerProofData = InnerProofData;
InnerProofData.NUM_PUBLIC_INPUTS = 8;
InnerProofData.LENGTH = InnerProofData.NUM_PUBLIC_INPUTS * 32;
InnerProofData.PADDING = InnerProofData.fromBuffer(Buffer.alloc(InnerProofData.LENGTH));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5uZXJfcHJvb2YuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm9sbHVwX3Byb29mL2lubmVyX3Byb29mLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9EQUF1RDtBQUN2RCw0Q0FBNkM7QUFFN0MsTUFBYSxjQUFjO0lBT3pCLFlBQ1MsT0FBZ0IsRUFDaEIsZUFBdUIsRUFDdkIsZUFBdUIsRUFDdkIsVUFBa0IsRUFDbEIsVUFBa0IsRUFDbEIsV0FBbUIsRUFDbkIsV0FBbUIsRUFDbkIsT0FBZTtRQVBmLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDaEIsb0JBQWUsR0FBZixlQUFlLENBQVE7UUFDdkIsb0JBQWUsR0FBZixlQUFlLENBQVE7UUFDdkIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNsQixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2xCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFFdEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFBLDBCQUFVLEVBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELHFCQUFxQjtRQUNuQixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNuQixJQUFBLHlCQUFhLEVBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLGVBQWU7WUFDcEIsSUFBSSxDQUFDLGVBQWU7WUFDcEIsSUFBSSxDQUFDLFVBQVU7WUFDZixJQUFJLENBQUMsVUFBVTtZQUNmLElBQUksQ0FBQyxXQUFXO1lBQ2hCLElBQUksQ0FBQyxXQUFXO1lBQ2hCLElBQUksQ0FBQyxPQUFPO1NBQ2IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFNBQVM7UUFDUCxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssdUJBQU8sQ0FBQyxPQUFPLENBQUM7SUFDMUMsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFVLENBQUMsaUJBQXlCO1FBQ3pDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNsQixNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELFNBQVMsSUFBSSxFQUFFLENBQUM7UUFDaEIsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxTQUFTLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDM0UsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUNoQixNQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLFNBQVMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMzRSxTQUFTLElBQUksRUFBRSxDQUFDO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsU0FBUyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLFNBQVMsSUFBSSxFQUFFLENBQUM7UUFDaEIsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxTQUFTLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDdEUsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUNoQixNQUFNLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLFNBQVMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUN2RSxTQUFTLElBQUksRUFBRSxDQUFDO1FBQ2hCLE1BQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsU0FBUyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZFLFNBQVMsSUFBSSxFQUFFLENBQUM7UUFDaEIsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxTQUFTLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDbkUsU0FBUyxJQUFJLEVBQUUsQ0FBQztRQUVoQixPQUFPLElBQUksY0FBYyxDQUN2QixPQUFPLEVBQ1AsZUFBZSxFQUNmLGVBQWUsRUFDZixVQUFVLEVBQ1YsVUFBVSxFQUNWLFdBQVcsRUFDWCxXQUFXLEVBQ1gsT0FBTyxDQUNSLENBQUM7SUFDSixDQUFDOztBQXRFSCx3Q0F1RUM7QUF0RVEsZ0NBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBQ3RCLHFCQUFNLEdBQUcsY0FBYyxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztBQUMvQyxzQkFBTyxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyJ9