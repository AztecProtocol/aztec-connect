"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTxId = void 0;
const sha3_1 = require("sha3");
const proof_id_1 = require("./proof_id");
const hash = new sha3_1.Keccak(256);
function createTxId(rawProofData) {
    const proofId = rawProofData.readUInt32BE(28);
    const txIdData = proofId === proof_id_1.ProofId.DEFI_DEPOSIT
        ? Buffer.concat([
            rawProofData.slice(0, 32),
            Buffer.alloc(32),
            rawProofData.slice(2 * 32),
        ])
        : rawProofData;
    hash.reset();
    return hash.update(txIdData).digest();
}
exports.createTxId = createTxId;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX3R4X2lkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudF9wcm9vZnMvcHJvb2ZfZGF0YS9jcmVhdGVfdHhfaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQThCO0FBQzlCLHlDQUFxQztBQUVyQyxNQUFNLElBQUksR0FBRyxJQUFJLGFBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUU3QixTQUFnQixVQUFVLENBQUMsWUFBb0I7SUFDN0MsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5QyxNQUFNLFFBQVEsR0FDWixPQUFPLEtBQUssa0JBQU8sQ0FBQyxZQUFZO1FBQzlCLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ1osWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2hCLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUMzQixDQUFDO1FBQ0osQ0FBQyxDQUFDLFlBQVksQ0FBQztJQUNuQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDYixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDeEMsQ0FBQztBQVpELGdDQVlDIn0=