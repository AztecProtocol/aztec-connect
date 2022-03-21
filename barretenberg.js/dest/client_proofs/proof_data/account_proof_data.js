"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountProofData = void 0;
const proof_data_1 = require("./proof_data");
const proof_id_1 = require("./proof_id");
class AccountProofData {
    constructor(proofData) {
        this.proofData = proofData;
        if (proofData.proofId !== proof_id_1.ProofId.ACCOUNT) {
            throw new Error('Not an account proof.');
        }
    }
    static fromBuffer(rawProofData) {
        return new AccountProofData(new proof_data_1.ProofData(rawProofData));
    }
}
exports.AccountProofData = AccountProofData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudF9wcm9vZl9kYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudF9wcm9vZnMvcHJvb2ZfZGF0YS9hY2NvdW50X3Byb29mX2RhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQXlDO0FBQ3pDLHlDQUFxQztBQUVyQyxNQUFhLGdCQUFnQjtJQUMzQixZQUE0QixTQUFvQjtRQUFwQixjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQzlDLElBQUksU0FBUyxDQUFDLE9BQU8sS0FBSyxrQkFBTyxDQUFDLE9BQU8sRUFBRTtZQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7U0FDMUM7SUFDSCxDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFvQjtRQUNwQyxPQUFPLElBQUksZ0JBQWdCLENBQUMsSUFBSSxzQkFBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQUNGO0FBVkQsNENBVUMifQ==